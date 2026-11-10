import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { decryptSecret, encryptSecret, maskedSecrets, redact } from './security.js';
import { liveEmitter, liveLog } from './live-log.js';
import { serviceConfigSchema, secretsSchema, type LiveSecrets } from './types.js';
import { createLiveGraph } from './graph/live-graph.js';
import { withRenderReadOnly } from './providers/render.js';

function requireLiveAccess(req: any, res: any, next: any) { const origin=process.env.FRONTEND_ORIGIN; if(!origin||!process.env.LIVE_API_TOKEN||!process.env.LIVE_SECRET_KEY)return res.status(503).json({error:'Live Mode is disabled: required security configuration is missing.'}); if(req.headers.origin===origin)res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type, X-Live-Token');if(req.method==='OPTIONS')return res.sendStatus(204);if(req.headers['x-live-token']!==process.env.LIVE_API_TOKEN)return res.status(401).json({error:'Invalid Live Mode token.'});next(); }
const publicService=(s:any)=>({...s,encryptedSecrets:undefined,secrets:maskedSecrets(),config:JSON.parse(s.configJson)});
const savesInProgress = new Set<string>();
export function createLiveRouter(prisma:PrismaClient,diagnose:(id:string,t:'manual'|'monitor')=>Promise<void>,startMonitoring:(id:string)=>Promise<void>,stopMonitoring:(id:string)=>void):Router { const router=Router();router.use(requireLiveAccess);
 router.get('/services',async(_q,res)=>res.json((await prisma.liveService.findMany({orderBy:{updatedAt:'desc'}})).map(publicService)));
 router.post('/services',async(req,res)=>{try{const config=serviceConfigSchema.parse(req.body.config);config.providerServiceId=config.providerServiceId.trim();const secrets=secretsSchema.parse(req.body.secrets);const identity=`${config.provider}:${config.providerServiceId}`;if(savesInProgress.has(identity))return res.status(409).json({error:'This provider service is already being saved. Please wait for the first request to finish.'});savesInProgress.add(identity);try{const matches=(await prisma.liveService.findMany()).filter(s=>s.providerServiceKey===identity||(()=>{const p=serviceConfigSchema.safeParse(JSON.parse(s.configJson));return p.success&&p.data.provider===config.provider&&p.data.providerServiceId.trim()===config.providerServiceId})());const [old,...duplicates]=matches;const data={name:config.name,provider:config.provider,providerServiceKey:identity,configJson:JSON.stringify(config),encryptedSecrets:encryptSecret(secrets)};const service=old?await prisma.liveService.update({where:{id:old.id},data}):await prisma.liveService.create({data});for(const duplicate of duplicates)stopMonitoring(duplicate.id);if(duplicates.length)await prisma.liveService.deleteMany({where:{id:{in:duplicates.map(item=>item.id)}}});await startMonitoring(service.id);res.status(old?200:201).json({id:service.id,name:service.name,provider:service.provider,secrets:maskedSecrets()});}finally{savesInProgress.delete(identity);}}catch(error){console.error('Live service validation failed:',redact(String(error)));res.status(400).json({error:'Invalid Live Mode service configuration.'});}});
 router.delete('/services/:id',async(req,res)=>{const service=await prisma.liveService.findUnique({where:{id:req.params.id}});if(!service)return res.sendStatus(404);stopMonitoring(service.id);await prisma.liveService.delete({where:{id:service.id}});res.status(204).end();});
 router.post('/services/:id/diagnose',async(req,res)=>{const service=await prisma.liveService.findUnique({where:{id:req.params.id}});if(!service)return res.sendStatus(404);void diagnose(service.id,'manual');res.status(202).json({message:'Diagnosis started.'});});
 router.get('/services/:id/runs',async(req,res)=>{const runs=await prisma.liveRun.findMany({where:{serviceId:req.params.id},orderBy:{startedAt:'desc'},take:20,include:{report:true}});res.json(runs.map(r=>({...r,report:r.report?JSON.parse(r.report.reportJson):null})));});
 router.get('/services/:id/test-connection',async(req,res)=>{const service=await prisma.liveService.findUnique({where:{id:req.params.id}});if(!service)return res.sendStatus(404);const config=serviceConfigSchema.parse(JSON.parse(service.configJson));const secrets=decryptSecret<LiveSecrets>(service.encryptedSecrets);const status:Record<string,string>={health:'pending',platform:'unavailable',logs:'unavailable',deployments:'unavailable',eventsMetrics:'unavailable',git:config.git?'not checked':'not configured'};try{const r=await fetch(config.healthUrl,{signal:AbortSignal.timeout(config.probeTimeoutMs)});status.health=`${r.ok?'ok':'failed'} (HTTP ${r.status})`;}catch{status.health='failed: probe did not complete';}if(config.provider==='render'){try{const tools=await withRenderReadOnly(secrets.providerToken,async(_call,available)=>available);status.platform=tools.length?'ok':'connected, but no allowed tools exposed';status.logs=tools.includes('list_logs')?'available':'unavailable';status.deployments=tools.includes('list_deploys')?'available':'unavailable';status.eventsMetrics=tools.some(t=>t==='list_events'||t==='get_metrics')?'available':'unavailable';}catch{status.platform='failed: platform authentication or connection unavailable';}}else status.platform='Vercel read-only REST adapter will be used during diagnosis.';res.json({status});});
 router.get('/runs/:runId',async(req,res)=>{const run=await prisma.liveRun.findUnique({where:{id:req.params.runId},include:{evidence:true,report:true,events:{orderBy:{createdAt:'asc'}}}});if(!run)return res.sendStatus(404);res.json({...run,report:run.report?JSON.parse(run.report.reportJson):null});});
 router.get('/runs/:runId/events',async(req,res)=>{const rows=await prisma.liveRunEvent.findMany({where:{runId:req.params.runId},orderBy:{createdAt:'asc'}});res.setHeader('Content-Type','text/event-stream');res.setHeader('Cache-Control','no-cache');res.flushHeaders();for(const row of rows)res.write(`data: ${JSON.stringify(row)}\n\n`);const name=`run:${req.params.runId}`;const callback=(event:unknown)=>res.write(`data: ${JSON.stringify(event)}\n\n`);liveEmitter.on(name,callback);req.on('close',()=>liveEmitter.off(name,callback));});return router; }
export function createDiagnoser(prisma: PrismaClient) {
  const graph = createLiveGraph(); const active = new Set<string>();
  return async (serviceId: string, trigger: 'manual'|'monitor') => {
    if (active.has(serviceId)) return; active.add(serviceId);
    const service = await prisma.liveService.findUniqueOrThrow({ where: { id: serviceId } });
    const config = serviceConfigSchema.parse(JSON.parse(service.configJson));
    const secrets = decryptSecret<LiveSecrets>(service.encryptedSecrets);
    const run = await prisma.liveRun.create({ data: { serviceId, status: 'RUNNING', trigger, model: config.llm.model } });
    try {
      await liveLog(prisma, run.id, 'info', 'Starting read-only Live Mode diagnosis.');
      const state: any = await graph.invoke({ config, platformToken: secrets.providerToken, gitToken: secrets.gitToken, geminiKey: secrets.geminiApiKey, trigger, evidence: [], gaps: [], hypotheses: [] }, { configurable: { thread_id: run.id } });
      const seen = new Set<string>();
      const evidence = (state.evidence ?? []).filter((item: any) => { const key = `${item.source}\u0000${item.observedAt}\u0000${item.content}`; if (seen.has(key)) return false; seen.add(key); return true; });
      for (const [index, item] of evidence.entries()) await prisma.liveEvidence.create({ data: { runId: run.id, evidenceId: `E${index + 1}`, source: item.source, observedAt: new Date(item.observedAt), content: redact(item.content), truncated: item.truncated } });
      await prisma.liveReport.create({ data: { runId: run.id, reportJson: JSON.stringify(state.report) } });
      await prisma.liveRun.update({ where: { id: run.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
      await liveLog(prisma, run.id, 'success', 'Diagnosis completed.');
    } catch (error) {
      console.error('Live diagnosis failed:', redact(String(error)));
      await prisma.liveRun.update({ where: { id: run.id }, data: { status: 'FAILED', completedAt: new Date() } });
      await liveLog(prisma, run.id, 'error', 'Diagnosis failed. Review backend logs for a redacted error.');
    } finally { active.delete(serviceId); }
  };
}
