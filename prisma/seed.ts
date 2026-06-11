import { db } from '@/lib/db'

async function seed() {
  const creators = [
    {
      name: 'Mistress Valentina',
      username: 'valentina_dom',
      bio: 'Professional dominatrix & content creator. Specializing in findom, JOI, and custom experiences. 5 years in the industry. Always looking for creative collabs!',
      niches: 'BDSM,Dominatrix,Findom,Roleplay,Custom Content',
      platforms: 'OnlyFans,Fansly,Twitter/X,Instagram',
      followerRange: '50k-100k',
      collabTypes: 'Shoutout for Shoutout,Content Collab,PPV Bundle Split,Brand Deal Split,Cross Promotion',
      location: 'Buenos Aires, Argentina',
      twitter: '@valentina_dom',
      instagram: '@valentina.domme',
      isVerified: true,
    },
    {
      name: 'Luna Rose',
      username: 'lunarose',
      bio: 'Lifestyle & fitness creator with a spicy twist. Love doing collabs with like-minded creators. Open to SFS and content exchanges!',
      niches: 'Fitness,Lifestyle,Petite,Custom Content',
      platforms: 'OnlyFans,Twitter/X,TikTok,Instagram',
      followerRange: '10k-50k',
      collabTypes: 'Shoutout for Shoutout,Content Collab,Cross Promotion,Discount Exchange',
      location: 'Miami, USA',
      twitter: '@lunarose_of',
      instagram: '@lunarose.fit',
      isVerified: true,
    },
    {
      name: 'Goddess Nyx',
      username: 'goddessnyx',
      bio: 'Findom & fetish content creator. Building an empire one sub at a time. Looking for other dommes to collab and cross-promote.',
      niches: 'BDSM,Findom,Feet,Dominatrix,Roleplay',
      platforms: 'OnlyFans,Fansly,Twitter/X',
      followerRange: '10k-50k',
      collabTypes: 'Shoutout for Shoutout,PPV Bundle Split,Cross Promotion,Brand Deal Split',
      location: 'London, UK',
      twitter: '@goddessnyx_',
      isVerified: false,
    },
    {
      name: 'KawaiiMia',
      username: 'kawaiimia',
      bio: 'Cosplay & gaming content with a naughty side. Anime lover, streamer, and custom content queen. Lets create something amazing together!',
      niches: 'Cosplay,Gaming,ASMR,Custom Content,Other',
      platforms: 'OnlyFans,Patreon,Twitter/X,Twitch',
      followerRange: '5k-10k',
      collabTypes: 'Content Collab,Shoutout for Shoutout,Live Stream Together,Custom Content Split',
      location: 'Tokyo, Japan',
      twitter: '@kawaiimia_of',
      instagram: '@kawaiimia.cos',
      isVerified: false,
    },
    {
      name: 'Scarlett & Jake',
      username: 'scarlettandjake',
      bio: 'Couple content creators. We do it all — from sensual to wild. Open to collabs with other couples or solo creators. Lets make magic!',
      niches: 'Couple,BDSM,Lifestyle,Roleplay,Custom Content',
      platforms: 'OnlyFans,Fansly,Twitter/X,Clapper',
      followerRange: '100k+',
      collabTypes: 'Content Collab,PPV Bundle Split,Shoutout for Shoutout,Live Stream Together,Brand Deal Split',
      location: 'LA, USA',
      twitter: '@scarlettjake_of',
      isVerified: true,
    },
    {
      name: 'Barbie Lux',
      username: 'barbielux',
      bio: 'Fashion & lifestyle with a boudoir twist. Creating premium aesthetic content. Looking for fashion-forward creators to collab!',
      niches: 'Fashion,Lifestyle,Art,Cosplay',
      platforms: 'OnlyFans,Instagram,Twitter/X,Patreon',
      followerRange: '5k-10k',
      collabTypes: 'Shoutout for Shoutout,Content Collab,Story Takeover,Cross Promotion',
      location: 'Milan, Italy',
      twitter: '@barbielux_of',
      instagram: '@barbielux.official',
      isVerified: false,
    },
  ]

  for (const creator of creators) {
    try {
      await db.creator.create({ data: creator })
      console.log(`Created: ${creator.name}`)
    } catch (e: any) {
      if (e.code === 'P2002') {
        console.log(`Already exists: ${creator.username}`)
      } else {
        console.error(`Error creating ${creator.name}:`, e)
      }
    }
  }

  console.log('Seed complete!')
}

seed()
  .catch(console.error)
  .finally(() => process.exit())
