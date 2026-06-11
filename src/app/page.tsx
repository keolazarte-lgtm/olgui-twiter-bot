'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart, Users, Search, Sparkles, ArrowRight, Check, X,
  Instagram, Twitter, Globe, Star, Filter, ChevronDown,
  Menu, Zap, Shield, TrendingUp, MessageCircle, Crown,
  Send, UserPlus, Eye, MapPin, ExternalLink,
  Clock, Play, Pause, Trash2, Upload, Image, FileText, Settings, Activity
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'

// ─── Constants ───────────────────────────────────────────────
const NICHES = [
  'BDSM', 'Fitness', 'Lifestyle', 'Gaming', 'Art', 'Music',
  'Fashion', 'Cooking', 'ASMR', 'Cosplay', 'Petite', 'MILF',
  'Couple', 'Trans', 'LGBTQ+', 'Dominatrix', 'Findom', 'Feet',
  'Roleplay', 'Custom Content', 'Other'
]

const PLATFORMS = [
  'OnlyFans', 'Fansly', 'Patreon', 'Twitter/X', 'Instagram',
  'Reddit', 'TikTok', 'YouTube', 'Clapper', 'Fanso'
]

const FOLLOWER_RANGES = [
  { value: '1k-5k', label: '1K - 5K' },
  { value: '5k-10k', label: '5K - 10K' },
  { value: '10k-50k', label: '10K - 50K' },
  { value: '50k-100k', label: '50K - 100K' },
  { value: '100k+', label: '100K+' },
]

const COLLAB_TYPES = [
  'Shoutout for Shoutout', 'Content Collab', 'PPV Bundle Split',
  'Custom Content Split', 'Live Stream Together', 'Brand Deal Split',
  'Cross Promotion', 'Story Takeover', 'Discount Exchange'
]

// ─── Types ───────────────────────────────────────────────────
interface Creator {
  id: string
  name: string
  username: string
  bio: string
  niches: string
  platforms: string
  followerRange: string
  collabTypes: string
  location: string | null
  twitter: string | null
  instagram: string | null
  onlyfans: string | null
  fansly: string | null
  website: string | null
  avatarUrl: string | null
  isVerified: boolean
  createdAt: string
}

type View = 'landing' | 'browse' | 'register' | 'pricing' | 'tweetbot'

// ─── Avatar Colors ───────────────────────────────────────────
const AVATAR_COLORS = [
  'from-rose-500 to-pink-600',
  'from-violet-500 to-purple-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-cyan-500 to-blue-600',
  'from-fuchsia-500 to-pink-600',
]

function getAvatarColor(name: string) {
  const index = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// ─── Navbar ──────────────────────────────────────────────────
function Navbar({ currentView, setView }: { currentView: View; setView: (v: View) => void }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems: { label: string; view: View; icon: React.ReactNode }[] = [
    { label: 'Home', view: 'landing', icon: <Sparkles className="w-4 h-4" /> },
    { label: 'Browse', view: 'browse', icon: <Search className="w-4 h-4" /> },
    { label: 'TweetBot', view: 'tweetbot', icon: <Twitter className="w-4 h-4" /> },
    { label: 'Register', view: 'register', icon: <UserPlus className="w-4 h-4" /> },
    { label: 'Pricing', view: 'pricing', icon: <Crown className="w-4 h-4" /> },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => setView('landing')}
            className="flex items-center gap-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white group-hover:text-rose-400 transition-colors">
              Collab<span className="text-rose-400">Match</span>
            </span>
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <button
                key={item.view}
                onClick={() => setView(item.view)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentView === item.view
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              onClick={() => setView('register')}
              className="bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white border-0"
            >
              Join Free
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-white p-2"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile nav */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden"
            >
              <div className="py-3 space-y-1">
                {navItems.map(item => (
                  <button
                    key={item.view}
                    onClick={() => { setView(item.view); setMobileOpen(false) }}
                    className={`flex items-center gap-2 w-full px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      currentView === item.view
                        ? 'bg-white/10 text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
                <Button
                  onClick={() => { setView('register'); setMobileOpen(false) }}
                  className="w-full mt-2 bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white border-0"
                >
                  Join Free
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}

// ─── Hero Section ────────────────────────────────────────────
function HeroSection({ setView }: { setView: (v: View) => void }) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const { toast } = useToast()

  const handleWaitlist = async () => {
    if (!email) return
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setSubmitted(true)
        toast({ title: 'You\'re on the list!', description: 'We\'ll notify you when we launch.' })
      } else if (res.status === 409) {
        toast({ title: 'Already registered!', description: 'This email is already on the waitlist.' })
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong. Try again.', variant: 'destructive' })
    }
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-black" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fuchsia-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Badge className="mb-6 bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20">
            <Zap className="w-3 h-3 mr-1" />
            Free to join — Limited beta
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white leading-tight mb-6">
            Find your next
            <br />
            <span className="bg-gradient-to-r from-rose-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
              collab partner
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            The smartest way for content creators to find collaboration partners.
            Match by niche, platform, audience size, and collab type.
            Stop searching manually — start matching.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button
              size="lg"
              onClick={() => setView('register')}
              className="bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white border-0 text-lg px-8 h-14"
            >
              Create Your Profile
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setView('browse')}
              className="border-white/20 text-white hover:bg-white/10 text-lg px-8 h-14"
            >
              <Search className="w-5 h-5 mr-2" />
              Browse Creators
            </Button>
          </div>

          {/* Waitlist */}
          {!submitted ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email for early access"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleWaitlist()}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-rose-500"
              />
              <Button
                onClick={handleWaitlist}
                className="bg-white text-black hover:bg-white/90 shrink-0"
              >
                Join Waitlist
              </Button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2 text-emerald-400"
            >
              <Check className="w-5 h-5" />
              <span>You&apos;re on the list! We&apos;ll be in touch.</span>
            </motion.div>
          )}

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { num: '500+', label: 'Creators' },
              { num: '50+', label: 'Niches' },
              { num: '1.2K+', label: 'Matches Made' },
            ].map(stat => (
              <div key={stat.label}>
                <div className="text-2xl sm:text-3xl font-bold text-white">{stat.num}</div>
                <div className="text-sm text-white/40">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Features Section ────────────────────────────────────────
function FeaturesSection() {
  const features = [
    {
      icon: <Search className="w-6 h-6" />,
      title: 'Smart Matching',
      desc: 'Our algorithm matches you with creators in your niche, with similar audience size and complementary content styles. No more random DMs.',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Verified Profiles',
      desc: 'Every creator is verified. No catfishing, no fake accounts, no time wasted. You know exactly who you\'re collabing with.',
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'Growth Analytics',
      desc: 'Track how your collabs impact your growth. See which partnerships drive the most subs, engagement, and revenue.',
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: 'Direct Connect',
      desc: 'Found a match? Connect directly through the platform. No middlemen, no agency fees. Just creators helping creators.',
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Instant Alerts',
      desc: 'Get notified when a perfect match joins. Never miss a collab opportunity with creators in your exact niche.',
    },
    {
      icon: <Crown className="w-6 h-6" />,
      title: 'Premium Deals',
      desc: 'Pro members get access to exclusive brand deal splits, group collabs, and featured placement in our creator directory.',
    },
  ]

  return (
    <section className="py-24 bg-black relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-rose-500/5 to-transparent" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Everything you need to
            <span className="bg-gradient-to-r from-rose-400 to-purple-400 bg-clip-text text-transparent"> collab smarter</span>
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Stop spending hours searching for collab partners on Twitter and Telegram.
            We bring the right creators to you.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="bg-white/5 border-white/10 hover:border-rose-500/30 transition-all h-full">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 flex items-center justify-center text-rose-400 mb-3">
                    {f.icon}
                  </div>
                  <CardTitle className="text-white text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Creator Card ────────────────────────────────────────────
function CreatorCard({ creator, onConnect }: { creator: Creator; onConnect: (c: Creator) => void }) {
  const niches = creator.niches.split(',').filter(Boolean)
  const platforms = creator.platforms.split(',').filter(Boolean)
  const color = getAvatarColor(creator.name)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card className="bg-white/5 border-white/10 hover:border-rose-500/30 transition-all group h-full flex flex-col">
        <CardContent className="p-5 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
              {getInitials(creator.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold truncate">{creator.name}</h3>
                {creator.isVerified && (
                  <div className="w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
              <p className="text-white/40 text-sm">@{creator.username}</p>
            </div>
            <Badge variant="outline" className="border-white/10 text-white/50 text-xs shrink-0">
              {FOLLOWER_RANGES.find(r => r.value === creator.followerRange)?.label || creator.followerRange}
            </Badge>
          </div>

          {/* Bio */}
          <p className="text-white/50 text-sm mb-4 line-clamp-2">{creator.bio}</p>

          {/* Niches */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {niches.slice(0, 4).map(niche => (
              <Badge key={niche} className="bg-rose-500/10 text-rose-400 border-0 text-xs hover:bg-rose-500/20">
                {niche.trim()}
              </Badge>
            ))}
            {niches.length > 4 && (
              <Badge className="bg-white/5 text-white/40 border-0 text-xs">
                +{niches.length - 4}
              </Badge>
            )}
          </div>

          {/* Platforms */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {platforms.slice(0, 3).map(p => (
              <Badge key={p} variant="outline" className="border-white/10 text-white/50 text-xs">
                {p.trim()}
              </Badge>
            ))}
            {platforms.length > 3 && (
              <Badge variant="outline" className="border-white/10 text-white/40 text-xs">
                +{platforms.length - 3}
              </Badge>
            )}
          </div>

          {/* Location */}
          {creator.location && (
            <div className="flex items-center gap-1 text-white/30 text-xs mb-4">
              <MapPin className="w-3 h-3" />
              {creator.location}
            </div>
          )}

          {/* Actions */}
          <div className="mt-auto flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white border-0"
              onClick={() => onConnect(creator)}
            >
              <Send className="w-3 h-3 mr-1" />
              Connect
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-white/10 text-white/60 hover:bg-white/5 hover:text-white min-w-[36px] min-h-[36px]" aria-label="View profile">
                  <Eye className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-white/10 max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-white flex items-center gap-2">
                    {creator.name}
                    {creator.isVerified && (
                      <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-white/60 text-sm">{creator.bio}</p>

                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Niches</p>
                    <div className="flex flex-wrap gap-1.5">
                      {niches.map(n => (
                        <Badge key={n} className="bg-rose-500/10 text-rose-400 border-0 text-xs">{n.trim()}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Platforms</p>
                    <div className="flex flex-wrap gap-1.5">
                      {platforms.map(p => (
                        <Badge key={p} variant="outline" className="border-white/10 text-white/60 text-xs">{p.trim()}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Collab Types</p>
                    <div className="flex flex-wrap gap-1.5">
                      {creator.collabTypes.split(',').filter(Boolean).map(c => (
                        <Badge key={c} className="bg-purple-500/10 text-purple-400 border-0 text-xs">{c.trim()}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <p className="text-white/40 text-xs uppercase tracking-wider">Social Links</p>
                    {creator.twitter && (
                      <a href={`https://twitter.com/${creator.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
                        <Twitter className="w-4 h-4" /> {creator.twitter}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {creator.instagram && (
                      <a href={`https://instagram.com/${creator.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
                        <Instagram className="w-4 h-4" /> {creator.instagram}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {creator.website && (
                      <a href={creator.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
                        <Globe className="w-4 h-4" /> {creator.website}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <Button
                    className="w-full bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white border-0"
                    onClick={() => onConnect(creator)}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Collab Request
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Browse Section ──────────────────────────────────────────
function BrowseSection() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [nicheFilter, setNicheFilter] = useState('all')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [followerFilter, setFollowerFilter] = useState('all')
  const [collabFilter, setCollabFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null)
  const { toast } = useToast()

  const fetchCreators = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (nicheFilter !== 'all') params.set('niche', nicheFilter)
      if (platformFilter !== 'all') params.set('platform', platformFilter)
      if (followerFilter !== 'all') params.set('followerRange', followerFilter)
      if (collabFilter !== 'all') params.set('collabType', collabFilter)
      if (searchQuery) params.set('search', searchQuery)

      const res = await fetch(`/api/creators?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setCreators(data)
      }
    } catch {
      toast({ title: 'Error loading creators', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [nicheFilter, platformFilter, followerFilter, collabFilter, searchQuery, toast])

  useEffect(() => {
    fetchCreators()
  }, [fetchCreators])

  const handleConnect = (creator: Creator) => {
    setSelectedCreator(creator)
    toast({
      title: `Collab request sent to @${creator.username}!`,
      description: 'They\'ll receive your profile and can accept or decline.',
    })
    setTimeout(() => setSelectedCreator(null), 3000)
  }

  return (
    <section className="min-h-screen pt-24 pb-16 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Browse <span className="bg-gradient-to-r from-rose-400 to-purple-400 bg-clip-text text-transparent">Creators</span>
          </h1>
          <p className="text-white/50">Find your next collab partner by niche, platform, and audience size</p>
        </div>

        {/* Search & Filter Bar */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                placeholder="Search by name, username, or niche..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-rose-500"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`border-white/10 ${showFilters ? 'bg-white/10 text-white' : 'text-white/60'}`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                  <Select value={nicheFilter} onValueChange={setNicheFilter}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Niche" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      <SelectItem value="all">All Niches</SelectItem>
                      {NICHES.map(n => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={platformFilter} onValueChange={setPlatformFilter}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Platform" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      <SelectItem value="all">All Platforms</SelectItem>
                      {PLATFORMS.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={followerFilter} onValueChange={setFollowerFilter}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Followers" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      <SelectItem value="all">All Sizes</SelectItem>
                      {FOLLOWER_RANGES.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={collabFilter} onValueChange={setCollabFilter}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Collab Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      <SelectItem value="all">All Types</SelectItem>
                      {COLLAB_TYPES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="bg-white/5 border-white/10 animate-pulse">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-white/10" />
                    <div className="flex-1">
                      <div className="h-4 w-24 bg-white/10 rounded mb-2" />
                      <div className="h-3 w-16 bg-white/10 rounded" />
                    </div>
                  </div>
                  <div className="h-3 w-full bg-white/10 rounded mb-2" />
                  <div className="h-3 w-3/4 bg-white/10 rounded mb-4" />
                  <div className="flex gap-1.5">
                    <div className="h-5 w-12 bg-white/10 rounded" />
                    <div className="h-5 w-16 bg-white/10 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : creators.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-white/10 mx-auto mb-4" />
            <h3 className="text-xl text-white/40 mb-2">No creators found</h3>
            <p className="text-white/25 mb-6">Try adjusting your filters or be the first to register!</p>
            <Button className="bg-gradient-to-r from-rose-500 to-purple-600 text-white border-0">
              <UserPlus className="w-4 h-4 mr-2" />
              Register Now
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {creators.map(creator => (
                <CreatorCard key={creator.id} creator={creator} onConnect={handleConnect} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Connect confirmation */}
        <AnimatePresence>
          {selectedCreator && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="bg-gradient-to-r from-rose-500 to-purple-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2">
                <Check className="w-4 h-4" />
                Request sent to @{selectedCreator.username}!
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

// ─── Register Section ────────────────────────────────────────
function RegisterSection({ setView }: { setView: (v: View) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    bio: '',
    niches: [] as string[],
    platforms: [] as string[],
    followerRange: '',
    collabTypes: [] as string[],
    location: '',
    twitter: '',
    instagram: '',
    onlyfans: '',
    fansly: '',
    website: '',
  })
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { toast } = useToast()

  const toggleItem = (field: 'niches' | 'platforms' | 'collabTypes', item: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item],
    }))
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.username || !formData.bio || !formData.followerRange) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/creators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          niches: formData.niches.join(','),
          platforms: formData.platforms.join(','),
          collabTypes: formData.collabTypes.join(','),
        }),
      })
      if (res.ok) {
        setSuccess(true)
        toast({ title: 'Profile created!', description: 'Your profile is now live on CollabMatch.' })
      } else if (res.status === 409) {
        toast({ title: 'Username taken', description: 'Try a different username.', variant: 'destructive' })
      } else {
        toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error. Try again.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <section className="min-h-screen pt-24 pb-16 bg-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">You&apos;re in!</h2>
          <p className="text-white/50 mb-8">
            Your profile is now live on CollabMatch. Start browsing creators and sending collab requests!
          </p>
          <Button
            onClick={() => setView('browse')}
            className="bg-gradient-to-r from-rose-500 to-purple-600 text-white border-0"
          >
            <Search className="w-4 h-4 mr-2" />
            Browse Creators
          </Button>
        </motion.div>
      </section>
    )
  }

  return (
    <section className="min-h-screen pt-24 pb-16 bg-black">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Create Your <span className="bg-gradient-to-r from-rose-400 to-purple-400 bg-clip-text text-transparent">Profile</span>
          </h1>
          <p className="text-white/50">Join thousands of creators looking for collab partners</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step >= s ? 'bg-gradient-to-r from-rose-500 to-purple-600 text-white' : 'bg-white/10 text-white/30'
              }`}>
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`flex-1 h-0.5 rounded ${step > s ? 'bg-gradient-to-r from-rose-500 to-purple-600' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>

                <div>
                  <label className="text-sm text-white/60 mb-1.5 block">Display Name *</label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="Your display name"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-1.5 block">Username *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">@</span>
                    <Input
                      value={formData.username}
                      onChange={e => setFormData(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                      placeholder="your_username"
                      className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-1.5 block">Bio *</label>
                  <Textarea
                    value={formData.bio}
                    onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))}
                    placeholder="Tell other creators about you and your content..."
                    rows={3}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-rose-500 resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-1.5 block">Follower Count *</label>
                  <Select value={formData.followerRange} onValueChange={v => setFormData(p => ({ ...p, followerRange: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Select your range" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      {FOLLOWER_RANGES.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-1.5 block">Location (optional)</label>
                  <Input
                    value={formData.location}
                    onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
                    placeholder="City, Country"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-rose-500"
                  />
                </div>

                <Button onClick={() => setStep(2)} className="w-full bg-gradient-to-r from-rose-500 to-purple-600 text-white border-0 mt-4">
                  Next Step
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )}

            {/* Step 2: Niches & Platforms */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <h3 className="text-lg font-semibold text-white mb-4">Niches & Platforms</h3>

                <div>
                  <label className="text-sm text-white/60 mb-3 block">Your Niches (select all that apply)</label>
                  <div className="flex flex-wrap gap-2">
                    {NICHES.map(niche => (
                      <button
                        key={niche}
                        onClick={() => toggleItem('niches', niche)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          formData.niches.includes(niche)
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-white/5 text-white/40 border border-white/10 hover:border-white/20'
                        }`}
                      >
                        {niche}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-3 block">Your Platforms (select all that apply)</label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map(platform => (
                      <button
                        key={platform}
                        onClick={() => toggleItem('platforms', platform)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          formData.platforms.includes(platform)
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : 'bg-white/5 text-white/40 border border-white/10 hover:border-white/20'
                        }`}
                      >
                        {platform}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-3 block">Collab Types You&apos;re Interested In</label>
                  <div className="flex flex-wrap gap-2">
                    {COLLAB_TYPES.map(type => (
                      <button
                        key={type}
                        onClick={() => toggleItem('collabTypes', type)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          formData.collabTypes.includes(type)
                            ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30'
                            : 'bg-white/5 text-white/40 border border-white/10 hover:border-white/20'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <Button variant="outline" onClick={() => setStep(1)} className="border-white/10 text-white/60 hover:bg-white/5">
                    Back
                  </Button>
                  <Button onClick={() => setStep(3)} className="flex-1 bg-gradient-to-r from-rose-500 to-purple-600 text-white border-0">
                    Next Step
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Social Links */}
            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Social Links (optional)</h3>

                <div>
                  <label className="text-sm text-white/60 mb-1.5 block">Twitter/X</label>
                  <Input
                    value={formData.twitter}
                    onChange={e => setFormData(p => ({ ...p, twitter: e.target.value }))}
                    placeholder="@username"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-1.5 block">Instagram</label>
                  <Input
                    value={formData.instagram}
                    onChange={e => setFormData(p => ({ ...p, instagram: e.target.value }))}
                    placeholder="@username"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-1.5 block">OnlyFans</label>
                  <Input
                    value={formData.onlyfans}
                    onChange={e => setFormData(p => ({ ...p, onlyfans: e.target.value }))}
                    placeholder="onlyfans.com/username"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-1.5 block">Fansly</label>
                  <Input
                    value={formData.fansly}
                    onChange={e => setFormData(p => ({ ...p, fansly: e.target.value }))}
                    placeholder="fansly.com/username"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-1.5 block">Website</label>
                  <Input
                    value={formData.website}
                    onChange={e => setFormData(p => ({ ...p, website: e.target.value }))}
                    placeholder="https://yoursite.com"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-rose-500"
                  />
                </div>

                <div className="flex gap-3 mt-4">
                  <Button variant="outline" onClick={() => setStep(2)} className="border-white/10 text-white/60 hover:bg-white/5">
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-rose-500 to-purple-600 text-white border-0"
                  >
                    {loading ? 'Creating...' : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Create Profile
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

// ─── Pricing Section ─────────────────────────────────────────
function PricingSection({ setView }: { setView: (v: View) => void }) {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      desc: 'Get started with basic matching',
      features: [
        'Create your creator profile',
        'Browse up to 20 creators/day',
        'Send 3 collab requests/day',
        'Basic filters (niche + platform)',
        'Community access',
      ],
      cta: 'Start Free',
      popular: false,
    },
    {
      name: 'Creator',
      price: '$9.99',
      period: '/month',
      desc: 'For serious creators ready to grow',
      features: [
        'Unlimited browsing & matches',
        'Unlimited collab requests',
        'Advanced filters (all types)',
        'Profile verification badge',
        'Priority in search results',
        'Analytics dashboard',
        'Direct messaging',
      ],
      cta: 'Go Creator',
      popular: true,
    },
    {
      name: 'Pro',
      price: '$29.99',
      period: '/month',
      desc: 'For full-time creators & agencies',
      features: [
        'Everything in Creator',
        'Featured placement in directory',
        'Collab performance analytics',
        'Brand deal pipeline access',
        'Multi-profile management',
        'API access',
        'Dedicated support',
        'Early access to new features',
      ],
      cta: 'Go Pro',
      popular: false,
    },
  ]

  return (
    <section className="min-h-screen pt-24 pb-16 bg-black">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Simple <span className="bg-gradient-to-r from-rose-400 to-purple-400 bg-clip-text text-transparent">Pricing</span>
          </h1>
          <p className="text-white/50 max-w-lg mx-auto">
            Start free, upgrade when you&apos;re ready. No hidden fees, cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Card className={`relative h-full flex flex-col ${
                plan.popular
                  ? 'bg-gradient-to-b from-rose-500/10 to-purple-500/10 border-rose-500/30'
                  : 'bg-white/5 border-white/10'
              }`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-rose-500 to-purple-600 text-white border-0 px-3">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardContent className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-white/40 text-sm mb-4">{plan.desc}</p>

                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-white/40 text-sm"> {plan.period}</span>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span className="text-white/60">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => setView('register')}
                    className={`w-full ${
                      plan.popular
                        ? 'bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white border-0'
                        : 'bg-white/10 text-white hover:bg-white/20 border-0'
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">FAQ</h2>
          <div className="space-y-4">
            {[
              { q: 'Is it really free to start?', a: 'Yes! The Free plan lets you create a profile, browse creators, and send up to 3 collab requests per day. No credit card required.' },
              { q: 'Can I cancel anytime?', a: 'Absolutely. No contracts, no commitments. Cancel your subscription anytime from your dashboard and you won\'t be charged again.' },
              { q: 'Is my information safe?', a: 'We take privacy seriously. Your personal data is encrypted and never shared. You control what\'s visible on your profile.' },
              { q: 'How does matching work?', a: 'Our algorithm considers your niche, platforms, audience size, and collab preferences to find the best matches. The more complete your profile, the better your matches.' },
            ].map(item => (
              <Card key={item.q} className="bg-white/5 border-white/10">
                <CardContent className="p-5">
                  <h4 className="text-white font-medium mb-2">{item.q}</h4>
                  <p className="text-white/50 text-sm">{item.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── TweetBot Dashboard ──────────────────────────────────────
const TWEET_TYPES = [
  { value: 'photo_teaser', label: 'Photo Teaser', icon: <Image className="w-4 h-4" /> },
  { value: 'phrase_hot', label: 'Hot Phrase', icon: <FileText className="w-4 h-4" /> },
  { value: 'call_to_action', label: 'Call to Action', icon: <Zap className="w-4 h-4" /> },
  { value: 'engagement_bait', label: 'Engagement Bait', icon: <MessageCircle className="w-4 h-4" /> },
  { value: 'countdown', label: 'Countdown', icon: <Clock className="w-4 h-4" /> },
  { value: 'social_proof', label: 'Social Proof', icon: <TrendingUp className="w-4 h-4" /> },
]

const ZONE_LABELS: Record<string, string> = {
  US_East: '🇺🇸 US East',
  US_West: '🇺🇸 US West',
  UK: '🇬🇧 UK',
  EU: '🇪🇺 Europe',
  AU: '🇦🇺 Australia',
  ASIA: '🇯🇵 Asia',
}

interface TweetContentItem {
  id: string
  type: string
  text: string
  mediaUrl: string | null
  status: string
  postedAt: string | null
  createdAt: string
}

interface ScheduleItem {
  id: string
  hourUtc: number
  timezone: string
  isActive: boolean
}

interface LogItem {
  id: string
  text: string
  zone: string
  postedAt: string
  status: string
  likes: number
  retweets: number
  views: number
}

function TweetBotDashboard() {
  const [activeTab, setActiveTab] = useState<'content' | 'schedule' | 'log' | 'config'>('content')
  const [contents, setContents] = useState<TweetContentItem[]>([])
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [logs, setLogs] = useState<LogItem[]>([])
  const [botActive, setBotActive] = useState(true)
  const [newText, setNewText] = useState('')
  const [newType, setNewType] = useState('phrase_hot')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      const [cRes, sRes, lRes] = await Promise.all([
        fetch('/api/tweets/content'),
        fetch('/api/tweets/schedule'),
        fetch('/api/tweets/log'),
      ])
      if (cRes.ok) setContents(await cRes.json())
      if (sRes.ok) setSchedules(await sRes.json())
      if (lRes.ok) setLogs(await lRes.json())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const addContent = async () => {
    if (!newText.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/tweets/content', {
        method: 'POST',
        body: (() => {
          const fd = new FormData()
          fd.append('type', newType)
          fd.append('text', newText)
          return fd
        })(),
      })
      if (res.ok) {
        setNewText('')
        toast({ title: 'Content added!', description: 'It will be used in the next tweet rotation.' })
        fetchData()
      }
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    } finally { setLoading(false) }
  }

  const deleteContent = async (id: string) => {
    await fetch(`/api/tweets/content?id=${id}`, { method: 'DELETE' })
    fetchData()
  }

  const toggleSchedule = async (id: string, isActive: boolean) => {
    await fetch('/api/tweets/schedule', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: !isActive }),
    })
    fetchData()
  }

  const pendingCount = contents.filter(c => c.status === 'pending').length
  const postedCount = contents.filter(c => c.status === 'posted').length

  const tabs = [
    { key: 'content' as const, label: 'Content', icon: <FileText className="w-4 h-4" /> },
    { key: 'schedule' as const, label: 'Schedule', icon: <Clock className="w-4 h-4" /> },
    { key: 'log' as const, label: 'History', icon: <Activity className="w-4 h-4" /> },
    { key: 'config' as const, label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ]

  return (
    <section className="min-h-screen pt-24 pb-16 bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              <Twitter className="w-8 h-8 inline-block text-sky-400 mr-2" />
              Tweet<span className="text-sky-400">Bot</span>
            </h1>
            <p className="text-white/50">Auto-post promo content 24/7 targeting foreign timezones</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              botActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${botActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              {botActive ? 'Active' : 'Paused'}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBotActive(!botActive)}
              className="border-white/10 text-white/60"
            >
              {botActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'In Queue', value: pendingCount, color: 'text-sky-400' },
            { label: 'Posted', value: postedCount, color: 'text-emerald-400' },
            { label: 'Zones Active', value: schedules.filter(s => s.isActive).length, color: 'text-amber-400' },
            { label: 'Total Tweets', value: logs.length, color: 'text-purple-400' },
          ].map(s => (
            <Card key={s.label} className="bg-white/5 border-white/10">
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-white/40">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/5 p-1 rounded-xl">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-sky-500/20 text-sky-400'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            {/* Add new content */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <h3 className="text-white font-medium mb-3">Add New Content</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white w-full sm:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      {TWEET_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          <span className="flex items-center gap-2">{t.icon} {t.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={newText}
                      onChange={e => setNewText(e.target.value)}
                      placeholder="Write your tweet text here..."
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-sky-500"
                      onKeyDown={e => e.key === 'Enter' && addContent()}
                    />
                    <Button
                      onClick={addContent}
                      disabled={loading || !newText.trim()}
                      className="bg-sky-500 hover:bg-sky-600 text-white shrink-0"
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content list */}
            <div className="space-y-2">
              {contents.length === 0 ? (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-8 text-center">
                    <FileText className="w-12 h-12 text-white/10 mx-auto mb-3" />
                    <p className="text-white/40">No content yet. Add your first tweet above!</p>
                  </CardContent>
                </Card>
              ) : (
                contents.map(item => (
                  <Card key={item.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className="shrink-0 mt-0.5">
                        {TWEET_TYPES.find(t => t.value === item.type)?.icon || <FileText className="w-4 h-4 text-white/40" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`text-xs border-0 ${
                            item.status === 'pending' ? 'bg-sky-500/10 text-sky-400' :
                            item.status === 'posted' ? 'bg-emerald-500/10 text-emerald-400' :
                            'bg-white/5 text-white/40'
                          }`}>
                            {item.status}
                          </Badge>
                          <Badge variant="outline" className="border-white/10 text-white/40 text-xs">
                            {TWEET_TYPES.find(t => t.value === item.type)?.label || item.type}
                          </Badge>
                        </div>
                        <p className="text-white/70 text-sm">{item.text}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteContent(item.id)}
                        className="text-white/20 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-3">
            <p className="text-white/40 text-sm mb-4">
              These are the hours (in UTC) when the bot will post. Toggle zones on/off.
              Argentina hours are AVOIDED for privacy.
            </p>
            {schedules.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8 text-center">
                  <Clock className="w-12 h-12 text-white/10 mx-auto mb-3" />
                  <p className="text-white/40">No schedules configured.</p>
                </CardContent>
              </Card>
            ) : (
              schedules.map(s => (
                <Card key={s.id} className={`bg-white/5 border-white/10 ${!s.isActive ? 'opacity-40' : ''}`}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-mono text-lg">{String(s.hourUtc).padStart(2, '0')}:00</span>
                      <Badge className="bg-white/5 text-white/60 border-0">
                        UTC
                      </Badge>
                      <span className="text-white/60 text-sm">
                        {ZONE_LABELS[s.timezone] || s.timezone}
                      </span>
                    </div>
                    <Switch
                      checked={s.isActive}
                      onCheckedChange={() => toggleSchedule(s.id, s.isActive)}
                    />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Log Tab */}
        {activeTab === 'log' && (
          <div className="space-y-2">
            {logs.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8 text-center">
                  <Activity className="w-12 h-12 text-white/10 mx-auto mb-3" />
                  <p className="text-white/40">No tweets posted yet. Connect your Twitter API in Settings to start!</p>
                </CardContent>
              </Card>
            ) : (
              logs.map(log => (
                <Card key={log.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs border-0 ${
                          log.status === 'posted' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {log.status}
                        </Badge>
                        <Badge variant="outline" className="border-white/10 text-white/40 text-xs">
                          {ZONE_LABELS[log.zone] || log.zone}
                        </Badge>
                      </div>
                      <span className="text-white/30 text-xs">
                        {new Date(log.postedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-white/60 text-sm">{log.text}</p>
                    {log.status === 'posted' && (
                      <div className="flex gap-4 mt-2 text-xs text-white/30">
                        <span>❤️ {log.likes}</span>
                        <span>🔁 {log.retweets}</span>
                        <span>👁️ {log.views}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Config Tab */}
        {activeTab === 'config' && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-white font-semibold mb-1">Twitter API Keys</h3>
                <p className="text-white/40 text-sm mb-4">
                  Get your keys for free at{' '}
                  <a href="https://developer.twitter.com" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
                    developer.twitter.com
                  </a>
                </p>
                <div className="space-y-3">
                  <div>
                    <Label className="text-white/60 text-sm">API Key</Label>
                    <Input placeholder="Enter your API Key" className="bg-white/5 border-white/10 text-white placeholder:text-white/20 mt-1" />
                  </div>
                  <div>
                    <Label className="text-white/60 text-sm">API Secret</Label>
                    <Input placeholder="Enter your API Secret" type="password" className="bg-white/5 border-white/10 text-white placeholder:text-white/20 mt-1" />
                  </div>
                  <div>
                    <Label className="text-white/60 text-sm">Access Token</Label>
                    <Input placeholder="Enter your Access Token" className="bg-white/5 border-white/10 text-white placeholder:text-white/20 mt-1" />
                  </div>
                  <div>
                    <Label className="text-white/60 text-sm">Access Token Secret</Label>
                    <Input placeholder="Enter your Access Token Secret" type="password" className="bg-white/5 border-white/10 text-white placeholder:text-white/20 mt-1" />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <h3 className="text-white font-semibold mb-3">Posting Frequency</h3>
                <div className="flex items-center gap-4">
                  <Label className="text-white/60 text-sm shrink-0">Every</Label>
                  <Select defaultValue="3">
                    <SelectTrigger className="bg-white/5 border-white/10 text-white w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="2">2 hours</SelectItem>
                      <SelectItem value="3">3 hours</SelectItem>
                      <SelectItem value="4">4 hours</SelectItem>
                      <SelectItem value="6">6 hours</SelectItem>
                      <SelectItem value="8">8 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button className="w-full bg-sky-500 hover:bg-sky-600 text-white">
                Save Settings
              </Button>

              <div className="pt-4 border-t border-white/10">
                <h3 className="text-white font-semibold mb-2">Cron Setup</h3>
                <p className="text-white/40 text-sm mb-3">
                  To auto-post, set up a cron job that hits this URL every hour:
                </p>
                <code className="block bg-black/50 text-sky-400 text-xs p-3 rounded-lg break-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/api/tweets/cron` : '/api/tweets/cron'}
                </code>
                <p className="text-white/30 text-xs mt-2">
                  Use <a href="https://cron-job.org" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">cron-job.org</a> (free) to schedule it.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  )
}

// ─── Footer ──────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-black border-t border-white/10 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center">
              <Heart className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm text-white/40">
              Collab<span className="text-rose-400">Match</span> — Creators helping creators
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/30">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Support</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ─── Main App ────────────────────────────────────────────────
export default function Home() {
  const [currentView, setCurrentView] = useState<View>('landing')

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Navbar currentView={currentView} setView={setCurrentView} />

      <main className="flex-1">
        {currentView === 'landing' && (
          <>
            <HeroSection setView={setCurrentView} />
            <FeaturesSection />
          </>
        )}
        {currentView === 'browse' && <BrowseSection />}
        {currentView === 'register' && <RegisterSection setView={setCurrentView} />}
        {currentView === 'pricing' && <PricingSection setView={setCurrentView} />}
        {currentView === 'tweetbot' && <TweetBotDashboard />}
      </main>

      <Footer />
    </div>
  )
}
