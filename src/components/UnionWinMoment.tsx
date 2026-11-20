import type {CSSProperties} from 'react';
import {assetURL} from '../lib/assets';
import {formatTime} from '../lib/leaderboard';
import {copy,isFrozen} from '../lib/settings';
import {CampaignText} from './CampaignText';

export function UnionWinMoment({roundTimes}:{roundTimes:number[]}){
 const mask=`url("${assetURL('/brand/official-year-55.png')}")`;
 return <section className={'union-win '+(isFrozen?'is-static':'is-animated')} aria-label="55 years of the Union celebration">
  <div className="union-win-stage">
   <div className="union-merging-scores" aria-hidden="true">
    {roundTimes.map((time,index)=><div className={'union-merging-score union-score-'+index} key={index}>
     <span>ROUND 0{index+1}</span><strong>{formatTime(time)}</strong>
    </div>)}
   </div>
   <div className="union-mark" role="img" aria-label="55" style={{maskImage:mask,WebkitMaskImage:mask} as CSSProperties}/>
   <p className="union-official-caption" lang="ar" dir="rtl"><CampaignText page="result" name="unionCaption">{copy('unionCaption')}</CampaignText></p>
  </div>
  <p className="union-equation" dir="ltr"><span>{roundTimes.map(formatTime).join(' + ')} = </span><CampaignText page="result" name="unionYears">{copy('unionYears')}</CampaignText></p>
  <p className="union-arabic" lang="ar" dir="rtl"><CampaignText page="result" name="unionArabic">{copy('unionArabic')}</CampaignText></p>
 </section>;
}
