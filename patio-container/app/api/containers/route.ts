import { z } from 'zod';
import { yardDb } from '@/lib/yard-db';
const fail = (error: string, status = 400) => Response.json({error}, {status});
function failure(e: unknown) { console.error(e); return String(e).includes('UNIQUE') ? fail('Código já cadastrado ou posição ocupada. Atualize o pátio e tente novamente.',409) : fail('Não foi possível acessar os dados. Tente novamente.',503); }
export async function GET() { try { const r = await yardDb().prepare('SELECT * FROM containers ORDER BY created DESC').all(); return Response.json(r.results); } catch(e) {return failure(e);} }
export async function POST(request: Request) {
 try {
 const parsed=z.object({code:z.string(),owner:z.string(),size:z.string(),cargo:z.string()}).safeParse(await request.json());
 if(!parsed.success)return fail('Preencha os campos do contêiner.');
 const b=parsed.data;
 if (typeof b.code !== 'string' || !/^[A-Z]{4}[0-9]{7}$/.test(b.code) || typeof b.owner !== 'string' || !b.owner.trim() || b.owner.length>100 || !['20','40'].includes(b.size) || typeof b.cargo!=='string' || b.cargo.length>200) return fail('Informe o código (4 letras e 7 números), cliente e tamanho válidos.');
 const now = new Date().toISOString();
 await yardDb().prepare('INSERT INTO containers (id,code,owner,size,cargo,status,created,updated,version) VALUES (?,?,?,?,?,?,?,?,0)').bind(crypto.randomUUID(),b.code,b.owner.trim(),b.size,b.cargo.trim(),'waiting',now,now).run();
 return Response.json({ok:true}, {status:201});
 } catch(e) {return failure(e);}
}
export async function PATCH(request: Request) {
 try {
 const parsed=z.object({id:z.string(),version:z.number().int().nonnegative(),action:z.enum(['allocate','release','depart']),position:z.string().optional()}).safeParse(await request.json());
 if(!parsed.success)return fail('Operação inválida.');
 const b=parsed.data;
 if(typeof b.id!=='string'||!Number.isInteger(b.version)||!['allocate','release','depart'].includes(b.action)) return fail('Operação inválida.');
 if(b.action==='allocate' && (typeof b.position!=='string'||! /^[ABC]-(0[1-9]|1[0-2])$/.test(b.position))) return fail('Selecione uma posição válida.');
 const status=b.action==='allocate'?'allocated':b.action==='depart'?'departed':'waiting';
 const r=await yardDb().prepare("UPDATE containers SET position=?, status=?, updated=?, version=version+1 WHERE id=? AND version=? AND status!='departed'").bind(b.action==='allocate'?b.position!:null,status,new Date().toISOString(),b.id,b.version).run();
 if(!r.meta.changes) return fail('O registro mudou. Atualize o pátio antes de tentar novamente.',409);
 return Response.json({ok:true});
 }catch(e){return failure(e);}
}
