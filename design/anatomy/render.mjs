import { createRequire } from 'node:module';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));
const require=createRequire(resolve(here,'../../apps/web/package.json'));
const sharp=require('sharp');
for(const name of ['verification-machine','verification-machine-blocked']) {
 await sharp(resolve(here,`../${name}.svg`)).resize(1600,960).png().toFile(resolve(here,`../${name}.png`));
 const pose=name.endsWith('blocked')?'blocked':'pass';
 await sharp(resolve(here,`../${name}.svg`)).resize(390,234).png().toFile(resolve(here,`phone-${pose}.png`));
 await sharp(resolve(here,`../${name}.svg`)).resize(3200,1920).png().toFile(resolve(here,`closeup-${pose}.png`));
 await sharp(resolve(here,`../${name}.svg`)).resize(3200,1920).extract({left:1350,top:350,width:900,height:900}).png().toFile(resolve(here,`mechanism-${pose}.png`));
 console.log(`Rendered ${name}.png at 1600 x 960, alpha preserved`);
}
