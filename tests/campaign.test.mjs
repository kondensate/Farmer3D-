import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CAMPAIGN_CHAPTERS, getCampaignProgress } from "../src/campaign.js";

test("campaign contains twelve ordered chapters with concrete objectives and rewards", () => {
  assert.equal(CAMPAIGN_CHAPTERS.length, 12);
  assert.equal(new Set(CAMPAIGN_CHAPTERS.map(chapter => chapter.id)).size, 12);
  for (const chapter of CAMPAIGN_CHAPTERS) {
    assert.ok(chapter.title && chapter.story && chapter.objective);
    assert.ok(chapter.target > 0 && chapter.rewardCoins > 0 && chapter.rewardXP > 0);
  }
});

test("campaign chapters read live farm, automation, research and region state", () => {
  assert.deepEqual(
    getCampaignProgress(0, { metrics: { planted: 2 } }),
    { complete: false, chapter: CAMPAIGN_CHAPTERS[0], progress: 2, target: 3, value: 2 }
  );
  assert.equal(getCampaignProgress(0, { metrics: { planted: 3 } }).complete, true);
  assert.equal(getCampaignProgress(4, { buildings: [{}, {}] }).complete, true);
  assert.equal(getCampaignProgress(5, { powerLinks: [{ from: 1, to: 2 }] }).complete, true);
  assert.equal(getCampaignProgress(7, { unlockedBiomes: new Set(["desert"]) }).complete, true);
  assert.equal(getCampaignProgress(8, { unlockedBiomes: new Set(["desert"]) }).complete, false);
  assert.equal(getCampaignProgress(10, { researchedTechs: ["a", "b"] }).complete, true);
  assert.equal(getCampaignProgress(11, { metrics: { sales: 100 } }).complete, true);
  assert.equal(getCampaignProgress(12).complete, true);
});

test("campaign chapter and conveyor deliveries are connected to the game loop and save data", () => {
  const main = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(main, /campaign:\{chapter:campaignChapter\}/);
  assert.match(main, /campaignChapter=Math\.max\(0,[\s\S]*?d\.campaign\?\.chapter/);
  assert.match(main, /function updateCampaign\(\)/);
  assert.match(main, /updateCampaign\(\);[\s\S]*?renderMissions\(\)/);
  assert.match(main, /metrics\.conveyorItemsDelivered=\(metrics\.conveyorItemsDelivered\|\|0\)/);
  assert.match(html, /id="campaignProgressCard"/);
});
