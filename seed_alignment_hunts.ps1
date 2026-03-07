$BASE = "https://pik-prd-production.up.railway.app"

function Post-Quest($name, $desc, $type, $objectives, $rewards, $minLevel, $sortOrder) {
  $body = @{
    name        = $name
    description = $desc
    quest_type  = $type
    objectives  = $objectives
    rewards     = $rewards
    min_level   = $minLevel
    sort_order  = $sortOrder
  } | ConvertTo-Json -Depth 10
  try {
    Invoke-RestMethod -Uri "$BASE/api/quests/templates" -Method POST -Body $body -ContentType "application/json" | Out-Null
    Write-Host "  [OK] [$type] $name" -ForegroundColor Green
    return 1
  } catch {
    Write-Host "  [FAIL] [$type] $name : $($_.Exception.Message)" -ForegroundColor Red
    return 0
  }
}

$ok = 0
Write-Host "Seeding 16 alignment hunts..." -ForegroundColor Yellow

$ok += Post-Quest "The Warden's Accounting" "The sentinel house's ledger has gone missing before the reckoning cycle." "ORDER" @(@{id="ord-1-a";type="complete_sessions";label="Complete 3 sessions";target=3},@{id="ord-1-b";type="reach_level";label="Reach Fate Level 5";target=5}) @{xp=250} 1 10
Start-Sleep -Milliseconds 200
$ok += Post-Quest "Seal the Breach" "A rift in the outer ward is letting something through." "ORDER" @(@{id="ord-2-a";type="complete_sessions";label="Complete 5 sessions";target=5},@{id="ord-2-b";type="defeat_boss";label="Defeat the boss twice";target=2}) @{xp=400;title_id="title_breach_warden"} 5 11
Start-Sleep -Milliseconds 200
$ok += Post-Quest "Judgment at the Threshold" "An accused stands before the council with no advocate." "ORDER" @(@{id="ord-3-a";type="complete_sessions";label="Complete 4 sessions";target=4},@{id="ord-3-b";type="earn_xp";label="Earn 2000 total XP";target=2000}) @{xp=300;title_id="title_threshold_judge"} 5 12
Start-Sleep -Milliseconds 200
$ok += Post-Quest "The Unbroken Line" "Three watchtowers have gone dark. Something is hunting the sentinels." "ORDER" @(@{id="ord-4-a";type="complete_sessions";label="Complete 8 sessions";target=8},@{id="ord-4-b";type="defeat_boss";label="Defeat the boss 4 times";target=4},@{id="ord-4-c";type="reach_level";label="Reach Fate Level 14";target=14}) @{xp=600;title_id="title_the_unbroken"} 10 13
Start-Sleep -Milliseconds 200
$ok += Post-Quest "Break the Pattern" "The Order has run the same ritual for seven cycles. Time to interrupt it." "CHAOS" @(@{id="cha-1-a";type="complete_sessions";label="Complete 3 sessions";target=3},@{id="cha-1-b";type="defeat_boss";label="Defeat the boss once";target=1}) @{xp=280} 1 20
Start-Sleep -Milliseconds 200
$ok += Post-Quest "The Wildfire Accord" "The flame-speakers are about to be extinguished by a truce neither side signed." "CHAOS" @(@{id="cha-2-a";type="complete_sessions";label="Complete 5 sessions";target=5},@{id="cha-2-b";type="earn_xp";label="Earn 1500 total XP";target=1500}) @{xp=350;title_id="title_wildfire"} 5 21
Start-Sleep -Milliseconds 200
$ok += Post-Quest "Unmaking the Map" "A cartographer surveys the Collapsed Quarter. The knowledge cannot leave." "CHAOS" @(@{id="cha-3-a";type="complete_sessions";label="Complete 4 sessions";target=4},@{id="cha-3-b";type="defeat_boss";label="Defeat the boss twice";target=2}) @{xp=320;title_id="title_unmade"} 5 22
Start-Sleep -Milliseconds 200
$ok += Post-Quest "Entropy's Dividend" "The sealed archive is the last thing standing between Order and collapse." "CHAOS" @(@{id="cha-4-a";type="complete_sessions";label="Complete 10 sessions";target=10},@{id="cha-4-b";type="defeat_boss";label="Defeat the boss 5 times";target=5},@{id="cha-4-c";type="reach_level";label="Reach Fate Level 14";target=14}) @{xp=650;title_id="title_entropys_heir"} 10 23
Start-Sleep -Milliseconds 200
$ok += Post-Quest "The Exposed Lie" "Someone forged the records. The forgery is hidden in plain sight." "LIGHT" @(@{id="lgt-1-a";type="complete_sessions";label="Complete 3 sessions";target=3},@{id="lgt-1-b";type="reach_level";label="Reach Fate Level 5";target=5}) @{xp=270} 1 30
Start-Sleep -Milliseconds 200
$ok += Post-Quest "Purge at Dawnfall" "The reliquary is contaminated. If it reaches the outer halls it cannot be stopped." "LIGHT" @(@{id="lgt-2-a";type="complete_sessions";label="Complete 5 sessions";target=5},@{id="lgt-2-b";type="defeat_boss";label="Defeat the boss twice";target=2}) @{xp=420;title_id="title_purifier"} 5 31
Start-Sleep -Milliseconds 200
$ok += Post-Quest "Testimony of Ash" "The burned testimonies are still readable if you know where to look." "LIGHT" @(@{id="lgt-3-a";type="complete_sessions";label="Complete 4 sessions";target=4},@{id="lgt-3-b";type="earn_xp";label="Earn 2000 total XP";target=2000}) @{xp=290;title_id="title_ash_keeper"} 5 32
Start-Sleep -Milliseconds 200
$ok += Post-Quest "The Illuminated Path" "The last keeper of the sun-charts must cross three levels of darkness." "LIGHT" @(@{id="lgt-4-a";type="complete_sessions";label="Complete 8 sessions";target=8},@{id="lgt-4-b";type="defeat_boss";label="Defeat the boss 4 times";target=4},@{id="lgt-4-c";type="reach_level";label="Reach Fate Level 14";target=14}) @{xp=580;title_id="title_sun_keeper"} 10 33
Start-Sleep -Milliseconds 200
$ok += Post-Quest "The Unseen Hand" "Someone feeds patrol coordinates to the Order. They believe they are invisible." "DARK" @(@{id="drk-1-a";type="complete_sessions";label="Complete 3 sessions";target=3},@{id="drk-1-b";type="reach_level";label="Reach Fate Level 5";target=5}) @{xp=280} 1 40
Start-Sleep -Milliseconds 200
$ok += Post-Quest "Veil Without Witness" "The extraction must be clean. No confirmed sightings. No trail." "DARK" @(@{id="drk-2-a";type="complete_sessions";label="Complete 5 sessions";target=5},@{id="drk-2-b";type="defeat_boss";label="Defeat the boss twice";target=2}) @{xp=440;title_id="title_veil_walker"} 5 41
Start-Sleep -Milliseconds 200
$ok += Post-Quest "The Price of Silence" "The debt-stone changes hands tonight. The bearer does not know what they carry." "DARK" @(@{id="drk-3-a";type="complete_sessions";label="Complete 4 sessions";target=4},@{id="drk-3-b";type="earn_xp";label="Earn 2000 total XP";target=2000}) @{xp=300;title_id="title_silence_keeper"} 5 42
Start-Sleep -Milliseconds 200
$ok += Post-Quest "Midnight Reckoning" "The courier leaves at the third bell. The message cannot reach its destination." "DARK" @(@{id="drk-4-a";type="complete_sessions";label="Complete 10 sessions";target=10},@{id="drk-4-b";type="defeat_boss";label="Defeat the boss 5 times";target=5},@{id="drk-4-c";type="reach_level";label="Reach Fate Level 14";target=14}) @{xp=620;title_id="title_midnight_hand"} 10 43

Write-Host ""
Write-Host "Done: $ok / 16 seeded." -ForegroundColor Yellow
