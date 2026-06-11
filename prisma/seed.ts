import { db } from '../src/lib/db'

async function main() {
  console.log('🌱 Seeding TweetBot data...')

  // Create default config
  const existingConfig = await db.tweetConfig.findFirst()
  if (!existingConfig) {
    await db.tweetConfig.create({
      data: {
        postIntervalHours: 3,
        isActive: false,
      },
    })
    console.log('✓ Default config created')
  }

  // Create default schedules for all timezones
  const defaultSchedules = [
    // US East
    { hourUtc: 13, timezone: 'US_East' },
    { hourUtc: 17, timezone: 'US_East' },
    { hourUtc: 23, timezone: 'US_East' },
    { hourUtc: 2, timezone: 'US_East' },
    // US West
    { hourUtc: 16, timezone: 'US_West' },
    { hourUtc: 20, timezone: 'US_West' },
    { hourUtc: 2, timezone: 'US_West' },
    { hourUtc: 5, timezone: 'US_West' },
    // UK
    { hourUtc: 8, timezone: 'UK' },
    { hourUtc: 13, timezone: 'UK' },
    { hourUtc: 19, timezone: 'UK' },
    { hourUtc: 22, timezone: 'UK' },
    // Europe
    { hourUtc: 7, timezone: 'EU' },
    { hourUtc: 12, timezone: 'EU' },
    { hourUtc: 18, timezone: 'EU' },
    { hourUtc: 21, timezone: 'EU' },
    // Australia
    { hourUtc: 21, timezone: 'AU' },
    { hourUtc: 2, timezone: 'AU' },
    { hourUtc: 8, timezone: 'AU' },
    { hourUtc: 11, timezone: 'AU' },
  ]

  const existingSchedules = await db.tweetSchedule.findMany()
  for (const slot of defaultSchedules) {
    const exists = existingSchedules.some(s => s.hourUtc === slot.hourUtc && s.timezone === slot.timezone)
    if (!exists) {
      await db.tweetSchedule.create({ data: slot })
    }
  }
  console.log('✓ Schedules created')

  // Create sample content
  const sampleContent = [
    {
      type: 'phrase_hot',
      text: 'Si te gusta lo prohibido, vas a querer ver todo lo que tengo para ti 🔥 link en bio',
      status: 'pending',
    },
    {
      type: 'photo_teaser',
      text: 'Solo un adelanto de lo que viene esta noche... 👀🔥',
      status: 'pending',
    },
    {
      type: 'call_to_action',
      text: 'Nuevo contenido subido 🔥 Entra antes que suba el precio → link en bio',
      status: 'pending',
    },
    {
      type: 'engagement_bait',
      text: '¿Te animás a decirme tu fantasía? 😈 La mejor va al DM gratis esta semana',
      status: 'pending',
    },
    {
      type: 'countdown',
      text: '⏳ 24 horas para el drop especial. Suscriptores entran primero. Link en bio',
      status: 'pending',
    },
    {
      type: 'social_proof',
      text: '🎉 Ya somos 500+ en la comunidad. Gracias por elegir lo exclusivo 🔥',
      status: 'pending',
    },
    {
      type: 'phrase_hot',
      text: 'No te lo van a contar. Lo tenés que ver por vos mismo 😈🔥',
      status: 'pending',
    },
    {
      type: 'call_to_action',
      text: 'Solo por hoy: descuento del 50% para los que entren desde acá 👇',
      status: 'pending',
    },
    {
      type: 'engagement_bait',
      text: '¿Picante o suave? 😈 Comentá y te mando un preview de lo que elegís',
      status: 'pending',
    },
    {
      type: 'photo_teaser',
      text: 'Te muestro solo un pedacito... el resto está adentro 🔒',
      status: 'pending',
    },
  ]

  for (const content of sampleContent) {
    await db.tweetContent.create({ data: content })
  }
  console.log('✓ Sample content created')

  // Create some sample tweet logs for the history view
  const sampleLogs = [
    {
      text: 'Si te gusta lo prohibido, vas a querer ver todo lo que tengo para ti 🔥 link en bio',
      zone: 'US_East',
      status: 'posted',
      likes: 24,
      retweets: 3,
      replies: 8,
      views: 1250,
      postedAt: new Date(Date.now() - 3600000 * 6),
    },
    {
      text: '¿Te animás a decirme tu fantasía? 😈 La mejor va al DM gratis esta semana',
      zone: 'UK',
      status: 'posted',
      likes: 45,
      retweets: 7,
      replies: 15,
      views: 2800,
      postedAt: new Date(Date.now() - 3600000 * 12),
    },
    {
      text: 'Nuevo contenido subido 🔥 Entra antes que suba el precio → link en bio',
      zone: 'US_West',
      status: 'posted',
      likes: 18,
      retweets: 2,
      replies: 5,
      views: 890,
      postedAt: new Date(Date.now() - 3600000 * 18),
    },
    {
      text: 'Solo un adelanto de lo que viene esta noche... 👀🔥',
      zone: 'EU',
      status: 'posted',
      likes: 32,
      retweets: 5,
      replies: 11,
      views: 1560,
      postedAt: new Date(Date.now() - 3600000 * 24),
    },
    {
      text: '⏳ 24 horas para el drop especial. Suscriptores entran primero.',
      zone: 'AU',
      status: 'posted',
      likes: 12,
      retweets: 1,
      replies: 3,
      views: 420,
      postedAt: new Date(Date.now() - 3600000 * 30),
    },
  ]

  for (const log of sampleLogs) {
    await db.tweetLog.create({ data: log })
  }
  console.log('✓ Sample tweet logs created')

  console.log('✅ Seed complete!')
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
