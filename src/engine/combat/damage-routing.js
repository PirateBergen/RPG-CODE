const SPECIAL_DAMAGE_MULTIPLIER=1.35
function getMobDamageRange(attack,lvl,tier="weak",data=null){if(data?.balanceVersion===3)return getCalibratedMobDamageRange(attack,data);const range=getMobBaseDamageRange(attack,lvl,tier,data);return attack?.special?{min:Math.round(range.min*SPECIAL_DAMAGE_MULTIPLIER),max:Math.round(range.max*SPECIAL_DAMAGE_MULTIPLIER)}:range}
