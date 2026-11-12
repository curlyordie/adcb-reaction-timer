import {handleApi,type Env} from '../../cloudflare/backend';
export const onRequest:PagesFunction<Env>=context=>handleApi(context.request,context.env);
