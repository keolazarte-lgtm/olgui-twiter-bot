import { db } from '@/lib/db'

async function seed() {
  // Seed default schedules targeting foreign timezones
  // All hours are UTC. Argentina is UTC-3, so we AVOID hours 12-03 UTC (9PM-12AM ARG)
  // We TARGET hours when foreign audiences are active

  const schedules = [
    // US East Coast (EST = UTC-5, EDT = UTC-4) — peak 8PM-11PM local = 0-3 UTC
    { hourUtc: 0, timezone: 'US_East' },   // 8PM EST
    { hourUtc: 1, timezone: 'US_East' },   // 9PM EST
    { hourUtc: 2, timezone: 'US_East' },   // 10PM EST
    { hourUtc: 3, timezone: 'US_East' },   // 11PM EST

    // US West Coast (PST = UTC-8, PDT = UTC-7) — peak 8PM-11PM local = 3-6 UTC
    { hourUtc: 3, timezone: 'US_West' },   // 8PM PST
    { hourUtc: 4, timezone: 'US_West' },   // 9PM PST
    { hourUtc: 5, timezone: 'US_West' },   // 10PM PST
    { hourUtc: 6, timezone: 'US_West' },   // 11PM PST

    // UK (GMT = UTC+0, BST = UTC+1) — peak 7PM-10PM local = 18-21 UTC
    { hourUtc: 18, timezone: 'UK' },       // 7PM GMT
    { hourUtc: 19, timezone: 'UK' },       // 8PM GMT
    { hourUtc: 20, timezone: 'UK' },       // 9PM GMT
    { hourUtc: 21, timezone: 'UK' },       // 10PM GMT

    // Europe (CET = UTC+1) — peak 7PM-10PM local = 17-20 UTC
    { hourUtc: 17, timezone: 'EU' },       // 7PM CET
    { hourUtc: 18, timezone: 'EU' },       // 8PM CET
    { hourUtc: 19, timezone: 'EU' },       // 9PM CET
    { hourUtc: 20, timezone: 'EU' },       // 10PM CET

    // Australia (AEST = UTC+10) — peak 7PM-10PM local = 9-12 UTC
    { hourUtc: 9, timezone: 'AU' },        // 7PM AEST
    { hourUtc: 10, timezone: 'AU' },       // 8PM AEST
    { hourUtc: 11, timezone: 'AU' },       // 9PM AEST

    // Asia morning (JST = UTC+9) — peak 8AM-10AM local = 23-1 UTC
    { hourUtc: 23, timezone: 'ASIA' },     // 8AM JST (next day)
    { hourUtc: 0, timezone: 'ASIA' },      // 9AM JST
  ]

  // Seed sample content for Olgui
  const sampleContent = [
    { type: 'phrase_hot', text: 'Just woke up and I\'m already thinking about you... 😈🔥' },
    { type: 'photo_teaser', text: 'You can only see this much here... the rest is behind the link 🔗😏' },
    { type: 'call_to_action', text: 'New content just dropped! 💦 Link in bio — don\'t miss it 👀' },
    { type: 'engagement_bait', text: 'I\'m replying to DMs right now... first 5 get something special 🎁' },
    { type: 'phrase_hot', text: 'Can\'t sleep... anyone wanna keep me company? 😘' },
    { type: 'call_to_action', text: 'Only 24 hours left for this exclusive PPV! ⏰🔥' },
    { type: 'social_proof', text: '500 new friends this week! 🎉 You guys are amazing 💕' },
    { type: 'photo_teaser', text: 'Just a little taste... 🍭 The full version is waiting for you 👅' },
    { type: 'engagement_bait', text: 'Tell me your fantasy and I\'ll make it come true... 💭✨' },
    { type: 'phrase_hot', text: 'Bored and alone... come play with me? 🎲😈' },
    { type: 'call_to_action', text: 'I just posted something you\'ve NEVER seen before 👀👇' },
    { type: 'photo_teaser', text: 'This is nothing compared to what\'s inside... 🤫' },
    { type: 'phrase_hot', text: 'Wet hair, no makeup, all natural... still bad? 💦' },
    { type: 'engagement_bait', text: 'Drop a 🔥 if you want me to DM you something spicy' },
    { type: 'call_to_action', text: 'Weekend special! 🎉 Subscribe now and get a free surprise 🎁' },
  ]

  for (const schedule of schedules) {
    try {
      await db.tweetSchedule.create({ data: schedule })
    } catch {
      // Skip if exists
    }
  }

  for (const content of sampleContent) {
    try {
      await db.tweetContent.create({ data: content })
    } catch {
      // Skip if exists
    }
  }

  // Create default config
  const existingConfig = await db.tweetConfig.findFirst()
  if (!existingConfig) {
    await db.tweetConfig.create({ data: {} })
  }

  console.log(`Seeded ${schedules.length} schedules and ${sampleContent.length} content items`)
}

seed()
  .catch(console.error)
  .finally(() => process.exit())
