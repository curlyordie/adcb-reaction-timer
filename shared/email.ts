// Practical email format validation shared by the registration form and API.
export function validEmail(value:string){
 const email=value.trim();if(email.length>254)return false;
 const parts=email.split('@');if(parts.length!==2)return false;
 const [local,domain]=parts;
 if(!local||local.length>64||local.startsWith('.')||local.endsWith('.')||local.includes('..')||!/^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/i.test(local))return false;
 const labels=domain.split('.');
 return labels.length>=2&&labels.every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))&&/^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/i.test(labels.at(-1)!);
}
