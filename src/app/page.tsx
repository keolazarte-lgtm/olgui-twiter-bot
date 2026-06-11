'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Twitter, Upload, Clock, Image, FileText, Settings, Activity,
  Play, Pause, Trash2, Plus, Zap, Globe, TrendingUp, Heart,
  Repeat2, MessageCircle, Eye, Check, X, AlertCircle, Loader2,
  Calendar, BarChart3, RefreshCw, ExternalLink, Shield
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
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ─── Types ───────────────────────────────────────────────────
interface TweetContent {
  id: string
  type: string
  text: string
  mediaUrl: string | null
  status: string
  postedAt: string | null
  createdAt: string
}

interface TweetSchedule {
  id: string
  hourUtc: Int
  timezone: string
  isActive: boolean
  createdAt: string
}

interface TweetLog {
  id: string
  contentId: string | null
  tweetId: string | null
  text: string
  mediaUrl: string | null
  zone: string
  postedAt: string
  likes: number
  retweets: number
  replies: number
  views: number
  status: string
  errorMsg: string | null
}

interface TweetConfig {
  id: string
  apiKey: string | null
  apiSecret: string | null
  accessToken: string | null
  accessTokenSecret: string | null
  postIntervalHours: number
  isActive: boolean
}

// ─── Constants ───────────────────────────────────────────────
const CONTENT_TYPES = [
  { value: 'photo_teaser', label: 'Foto Teaser', icon: '📸', desc: 'Foto cortada / preview' },
  { value: 'phrase_hot', label: 'Frase Hot', icon: '🔥', desc: 'Texto provocativo / llamada de atención' },
  { value: 'call_to_action', label: 'Call to Action', icon: '👉', desc: 'Link a OF / Fansly con frase' },
  { value: 'countdown', label: 'Countdown', icon: '⏳', desc: 'Conteo regresivo a nuevo contenido' },
  { value: 'engagement_bait', label: 'Engagement Bait', icon: '💬', desc: 'Pregunta / encuesta / interacción' },
  { value: 'social_proof', label: 'Social Proof', icon: '⭐', desc: 'Testimonio / logro / milestone' },
]

const TIMEZONES = [
  { value: 'US_East', label: '🇺🇸 US East (NYC)', utcOffset: -5, peakHours: [8, 12, 18, 21] },
  { value: 'US_West', label: '🇺🇸 US West (LA)', utcOffset: -8, peakHours: [8, 12, 18, 21] },
  { value: 'UK', label: '🇬🇧 UK (London)', utcOffset: 0, peakHours: [8, 13, 19, 22] },
  { value: 'EU', label: '🇪🇺 Europe (Berlin)', utcOffset: 1, peakHours: [8, 13, 19, 22] },
  { value: 'AU', label: '🇦🇺 Australia (Sydney)', utcOffset: 11, peakHours: [8, 13, 19, 22] },
]

// Pre-defined schedule: optimal posting times for each timezone
const DEFAULT_SCHEDULES = [
  // US East - morning, lunch, after work, evening
  { hourUtc: 13, timezone: 'US_East' },  // 8am EST
  { hourUtc: 17, timezone: 'US_East' },  // 12pm EST
  { hourUtc: 23, timezone: 'US_East' },  // 6pm EST
  { hourUtc: 2, timezone: 'US_East' },   // 9pm EST
  // US West
  { hourUtc: 16, timezone: 'US_West' },  // 8am PST
  { hourUtc: 20, timezone: 'US_West' },  // 12pm PST
  { hourUtc: 2, timezone: 'US_West' },   // 6pm PST
  { hourUtc: 5, timezone: 'US_West' },   // 9pm PST
  // UK
  { hourUtc: 8, timezone: 'UK' },        // 8am GMT
  { hourUtc: 13, timezone: 'UK' },       // 1pm GMT
  { hourUtc: 19, timezone: 'UK' },       // 7pm GMT
  { hourUtc: 22, timezone: 'UK' },       // 10pm GMT
  // Europe
  { hourUtc: 7, timezone: 'EU' },        // 8am CET
  { hourUtc: 12, timezone: 'EU' },       // 1pm CET
  { hourUtc: 18, timezone: 'EU' },       // 7pm CET
  { hourUtc: 21, timezone: 'EU' },       // 10pm CET
  // Australia
  { hourUtc: 21, timezone: 'AU' },       // 8am AEDT (next day)
  { hourUtc: 2, timezone: 'AU' },        // 1pm AEDT
  { hourUtc: 8, timezone: 'AU' },        // 7pm AEDT
  { hourUtc: 11, timezone: 'AU' },       // 10pm AEDT
]

// ─── Helper Functions ────────────────────────────────────────
function getContentTypeLabel(type: string) {
  return CONTENT_TYPES.find(t => t.value === type)?.label || type
}

function getContentTypeIcon(type: string) {
  return CONTENT_TYPES.find(t => t.value === type)?.icon || '📝'
}

function getTimezoneLabel(tz: string) {
  return TIMEZONES.find(t => t.value === tz)?.label || tz
}

function formatHourUTC(hourUtc: number) {
  const h = hourUtc.toString().padStart(2, '0')
  return `${h}:00 UTC`
}

function formatLocalTime(hourUtc: number, tz: string) {
  const tzInfo = TIMEZONES.find(t => t.value === tz)
  if (!tzInfo) return ''
  let local = hourUtc + tzInfo.utcOffset
  if (local < 0) local += 24
  if (local >= 24) local -= 24
  const h = Math.floor(local).toString().padStart(2, '0')
  return `${h}:00 local`
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days}d`
}

// ─── Main App ────────────────────────────────────────────────
export default function TweetBotApp() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [config, setConfig] = useState<TweetConfig | null>(null)
  const [contents, setContents] = useState<TweetContent[]>([])
  const [schedules, setSchedules] = useState<TweetSchedule[]>([])
  const [logs, setLogs] = useState<TweetLog[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Fetch all data
  const fetchAll = useCallback(async () => {
    try {
      const [configRes, contentRes, scheduleRes, logRes] = await Promise.all([
        fetch('/api/tweets/config'),
        fetch('/api/tweets/content'),
        fetch('/api/tweets/schedule'),
        fetch('/api/tweets/log'),
      ])

      if (configRes.ok) setConfig(await configRes.json())
      if (contentRes.ok) setContents(await contentRes.json())
      if (scheduleRes.ok) setSchedules(await scheduleRes.json())
      if (logRes.ok) setLogs(await logRes.json())
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [fetchAll])

  const hasApiKeys = !!(config?.apiKey && config?.apiSecret && config?.accessToken && config?.accessTokenSecret)
  const pendingContent = contents.filter(c => c.status === 'pending')
  const postedContent = contents.filter(c => c.status === 'posted')
  const activeSchedules = schedules.filter(s => s.isActive)
  const totalEngagement = logs.reduce((acc, l) => acc + l.likes + l.retweets + l.replies, 0)
  const totalViews = logs.reduce((acc, l) => acc + l.views, 0)
  const postedCount = logs.filter(l => l.status === 'posted').length
  const failedCount = logs.filter(l => l.status === 'failed').length

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-sky-400 animate-spin mx-auto mb-4" />
          <p className="text-white/50 text-sm">Cargando TweetBot...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
              <Twitter className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">TweetBot</h1>
              <p className="text-white/40 text-xs">Auto-Promo Scheduler</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {config?.isActive && hasApiKeys ? (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Activo
              </Badge>
            ) : (
              <Badge className="bg-white/5 text-white/40 border-white/10 gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                {hasApiKeys ? 'Pausado' : 'Sin API Keys'}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab Navigation - Mobile Bottom Bar */}
          <TabsList className="hidden">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardTab
              config={config}
              contents={contents}
              schedules={schedules}
              logs={logs}
              hasApiKeys={hasApiKeys}
              pendingContent={pendingContent}
              postedContent={postedContent}
              activeSchedules={activeSchedules}
              totalEngagement={totalEngagement}
              totalViews={totalViews}
              postedCount={postedCount}
              failedCount={failedCount}
              onRefresh={fetchAll}
              onNavigate={setActiveTab}
            />
          </TabsContent>

          <TabsContent value="content">
            <ContentTab contents={contents} onRefresh={fetchAll} />
          </TabsContent>

          <TabsContent value="schedule">
            <ScheduleTab schedules={schedules} onRefresh={fetchAll} />
          </TabsContent>

          <TabsContent value="history">
            <HistoryTab logs={logs} onRefresh={fetchAll} />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab config={config} onRefresh={fetchAll} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/10 safe-area-bottom">
        <div className="max-w-5xl mx-auto flex items-center justify-around py-2 px-2">
          {[
            { id: 'dashboard', icon: Activity, label: 'Panel' },
            { id: 'content', icon: Image, label: 'Contenido' },
            { id: 'schedule', icon: Clock, label: 'Horarios' },
            { id: 'history', icon: BarChart3, label: 'Historial' },
            { id: 'settings', icon: Settings, label: 'Config' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all min-w-[56px] ${
                activeTab === tab.id
                  ? 'text-sky-400'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-sky-400' : ''}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

// ─── Dashboard Tab ───────────────────────────────────────────
function DashboardTab({
  config, contents, schedules, logs, hasApiKeys,
  pendingContent, postedContent, activeSchedules,
  totalEngagement, totalViews, postedCount, failedCount,
  onRefresh, onNavigate
}: {
  config: TweetConfig | null
  contents: TweetContent[]
  schedules: TweetSchedule[]
  logs: TweetLog[]
  hasApiKeys: boolean
  pendingContent: TweetContent[]
  postedContent: TweetContent[]
  activeSchedules: TweetSchedule[]
  totalEngagement: number
  totalViews: number
  postedCount: number
  failedCount: number
  onRefresh: () => void
  onNavigate: (tab: string) => void
}) {
  const lastTweet = logs.find(l => l.status === 'posted')

  return (
    <div className="space-y-4">
      {/* Welcome banner */}
      {!hasApiKeys && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-amber-200 text-sm font-medium">Configurá tus API Keys de Twitter</p>
                <p className="text-amber-200/60 text-xs mt-1">Sin las keys el bot no puede publicar. Andá a Config para cargarlas.</p>
              </div>
              <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10" onClick={() => onNavigate('settings')}>
                Config
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-sky-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{pendingContent.length}</p>
              <p className="text-white/40 text-xs">Pendientes</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{postedCount}</p>
              <p className="text-white/40 text-xs">Publicados</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-rose-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{totalEngagement.toLocaleString()}</p>
              <p className="text-white/40 text-xs">Engagement</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-purple-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{totalViews.toLocaleString()}</p>
              <p className="text-white/40 text-xs">Views</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bot Status & Quick Actions */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-400" />
              Estado del Bot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">Estado</span>
              <Badge className={config?.isActive && hasApiKeys ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-white/40 border-white/10'}>
                {config?.isActive && hasApiKeys ? '🟢 Activo' : '⏸️ Pausado'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">Intervalo</span>
              <span className="text-white text-sm font-medium">Cada {config?.postIntervalHours || 3}hs</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">API Keys</span>
              <span className={`text-sm font-medium ${hasApiKeys ? 'text-emerald-400' : 'text-amber-400'}`}>
                {hasApiKeys ? '✓ Configuradas' : '✗ Faltan'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">Horarios activos</span>
              <span className="text-white text-sm font-medium">{activeSchedules.length} slots</span>
            </div>
            {lastTweet && (
              <div className="pt-2 border-t border-white/10">
                <span className="text-white/40 text-xs">Último tweet: {timeAgo(lastTweet.postedAt)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-rose-400" />
              Contenido por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {CONTENT_TYPES.map(type => {
              const count = contents.filter(c => c.type === type.value).length
              const maxCount = Math.max(...CONTENT_TYPES.map(t => contents.filter(c => c.type === t.value).length), 1)
              return (
                <div key={type.value} className="flex items-center gap-2">
                  <span className="text-sm w-5">{type.icon}</span>
                  <span className="text-white/60 text-xs flex-1">{type.label}</span>
                  <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-white/50 text-xs w-5 text-right">{count}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => onNavigate('content')}
          className="h-20 bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/20 hover:border-sky-500/40 text-white flex flex-col gap-1"
          variant="outline"
        >
          <Upload className="w-5 h-5 text-sky-400" />
          <span className="text-xs">Subir Contenido</span>
        </Button>
        <Button
          onClick={() => onNavigate('schedule')}
          className="h-20 bg-gradient-to-br from-purple-500/20 to-fuchsia-600/20 border border-purple-500/20 hover:border-purple-500/40 text-white flex flex-col gap-1"
          variant="outline"
        >
          <Clock className="w-5 h-5 text-purple-400" />
          <span className="text-xs">Config Horarios</span>
        </Button>
      </div>

      {/* Recent Activity */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Actividad Reciente
            </CardTitle>
            <Button size="sm" variant="ghost" className="text-white/40 h-7 text-xs" onClick={onRefresh}>
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8">
              <Twitter className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/30 text-sm">No hay tweets publicados todavía</p>
              <p className="text-white/20 text-xs mt-1">Cargá contenido y configurá los horarios para empezar</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {logs.slice(0, 10).map(log => (
                <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    log.status === 'posted' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                  }`}>
                    {log.status === 'posted' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <X className="w-3 h-3 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/70 text-sm truncate">{log.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-white/5 text-white/40 border-0 text-[10px]">
                        {getTimezoneLabel(log.zone)}
                      </Badge>
                      <span className="text-white/30 text-[10px]">{timeAgo(log.postedAt)}</span>
                      {log.status === 'posted' && (
                        <span className="text-white/30 text-[10px]">
                          ❤️{log.likes} 🔄{log.retweets} 👁️{log.views}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Content Tab ─────────────────────────────────────────────
function ContentTab({ contents, onRefresh }: { contents: TweetContent[]; onRefresh: () => void }) {
  const [showUpload, setShowUpload] = useState(false)
  const [uploadType, setUploadType] = useState('phrase_hot')
  const [uploadText, setUploadText] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const { toast } = useToast()

  const pendingContent = contents.filter(c => c.status === 'pending')
  const postedContent = contents.filter(c => c.status === 'posted')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setPreviewUrl(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleUpload = async () => {
    if (!uploadText.trim() && !selectedFile) {
      toast({ title: 'Error', description: 'Agregá texto o una imagen', variant: 'destructive' })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('type', uploadType)
      formData.append('text', uploadText)
      if (selectedFile) {
        formData.append('media', selectedFile)
      }

      const res = await fetch('/api/tweets/content', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        toast({ title: '✓ Contenido agregado', description: 'Se agregó a la cola de publicación' })
        setUploadText('')
        setSelectedFile(null)
        setPreviewUrl(null)
        setShowUpload(false)
        onRefresh()
      } else {
        toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/tweets/content?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Eliminado', description: 'Contenido eliminado de la cola' })
        onRefresh()
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' })
    }
  }

  const handleResetPosted = async () => {
    // Reset all posted content back to pending for rotation
    for (const c of postedContent) {
      try {
        await fetch('/api/tweets/content', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: c.id, status: 'pending' }),
        })
      } catch { /* silent */ }
    }
    toast({ title: '✓ Contenido reciclado', description: `${postedContent.length} items vuelven a la cola` })
    onRefresh()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Biblioteca de Contenido</h2>
          <p className="text-white/40 text-sm">{pendingContent.length} pendientes · {postedContent.length} publicados</p>
        </div>
        <Button
          onClick={() => setShowUpload(!showUpload)}
          className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white border-0"
        >
          <Plus className="w-4 h-4 mr-1" />
          Agregar
        </Button>
      </div>

      {/* Upload Form */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="bg-white/5 border-white/10 border-sky-500/20">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-white font-medium text-sm">Nuevo Contenido</h3>

                {/* Content Type */}
                <div>
                  <label className="text-white/50 text-xs mb-2 block">Tipo de contenido</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CONTENT_TYPES.map(type => (
                      <button
                        key={type.value}
                        onClick={() => setUploadType(type.value)}
                        className={`p-2 rounded-lg text-center transition-all text-xs ${
                          uploadType === type.value
                            ? 'bg-sky-500/20 border border-sky-500/40 text-white'
                            : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-lg block mb-1">{type.icon}</span>
                        <span className="block leading-tight">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text */}
                <div>
                  <label className="text-white/50 text-xs mb-2 block">Texto del tweet</label>
                  <Textarea
                    value={uploadText}
                    onChange={e => setUploadText(e.target.value)}
                    placeholder={uploadType === 'photo_teaser' ? 'Caption para la foto...' : 'Escribí tu tweet acá...'}
                    rows={3}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-sky-500 resize-none text-sm"
                  />
                  <p className="text-white/30 text-[10px] mt-1 text-right">{uploadText.length}/280</p>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="text-white/50 text-xs mb-2 block">Imagen (opcional)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {previewUrl ? (
                    <div className="relative rounded-lg overflow-hidden border border-white/10">
                      <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover" />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2 h-7 w-7 p-0"
                        onClick={() => { setSelectedFile(null); setPreviewUrl(null) }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-24 rounded-lg border-2 border-dashed border-white/10 hover:border-sky-500/40 transition-colors flex flex-col items-center justify-center gap-2 text-white/30 hover:text-white/50"
                    >
                      <Upload className="w-6 h-6" />
                      <span className="text-xs">Tocá para subir imagen</span>
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white border-0"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                    {uploading ? 'Guardando...' : 'Guardar'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setShowUpload(false); setSelectedFile(null); setPreviewUrl(null); setUploadText('') }}
                    className="border-white/10 text-white/60"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending Content */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            Pendientes ({pendingContent.length})
          </h3>
        </div>
        {pendingContent.length === 0 ? (
          <Card className="bg-white/[0.02] border-white/5">
            <CardContent className="p-8 text-center">
              <Image className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/30 text-sm">No hay contenido pendiente</p>
              <p className="text-white/20 text-xs mt-1">Tocá "Agregar" para empezar a cargar</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {pendingContent.map(item => (
              <ContentCard key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* Posted Content */}
      {postedContent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Publicados ({postedContent.length})
            </h3>
            <Button size="sm" variant="ghost" className="text-sky-400 h-7 text-xs" onClick={handleResetPosted}>
              <RefreshCw className="w-3 h-3 mr-1" />
              Reciclar todo
            </Button>
          </div>
          <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
            {postedContent.map(item => (
              <ContentCard key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ContentCard({ item, onDelete }: { item: TweetContent; onDelete: (id: string) => void }) {
  return (
    <Card className="bg-white/[0.03] border-white/[0.06] hover:border-white/10 transition-colors">
      <CardContent className="p-3 flex items-start gap-3">
        {/* Image thumbnail or type icon */}
        {item.mediaUrl ? (
          <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-white/10">
            <img src={item.mediaUrl} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-2xl">
            {getContentTypeIcon(item.type)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-white/5 text-white/50 border-0 text-[10px]">
              {getContentTypeLabel(item.type)}
            </Badge>
            <Badge className={`${item.status === 'pending' ? 'bg-sky-500/10 text-sky-400' : 'bg-emerald-500/10 text-emerald-400'} border-0 text-[10px]`}>
              {item.status === 'pending' ? 'Pendiente' : 'Publicado'}
            </Badge>
          </div>
          <p className="text-white/70 text-sm line-clamp-2">{item.text || '(sin texto)'}</p>
          <p className="text-white/25 text-[10px] mt-1">{timeAgo(item.createdAt)}</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-white/20 hover:text-red-400 h-8 w-8 p-0 shrink-0"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Schedule Tab ────────────────────────────────────────────
function ScheduleTab({ schedules, onRefresh }: { schedules: TweetSchedule[]; onRefresh: () => void }) {
  const [selectedTz, setSelectedTz] = useState('US_East')
  const [addingSlot, setAddingSlot] = useState<number | null>(null)
  const { toast } = useToast()

  const handleAddDefault = async () => {
    try {
      // Add default schedules for all timezones
      for (const slot of DEFAULT_SCHEDULES) {
        // Check if this slot already exists
        const exists = schedules.some(s => s.hourUtc === slot.hourUtc && s.timezone === slot.timezone)
        if (!exists) {
          await fetch('/api/tweets/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(slot),
          })
        }
      }
      toast({ title: '✓ Horarios configurados', description: 'Se crearon los horarios óptimos para todas las zonas' })
      onRefresh()
    } catch {
      toast({ title: 'Error', description: 'No se pudieron crear los horarios', variant: 'destructive' })
    }
  }

  const handleAddSlot = async () => {
    if (addingSlot === null) return
    try {
      const res = await fetch('/api/tweets/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hourUtc: addingSlot, timezone: selectedTz, isActive: true }),
      })
      if (res.ok) {
        toast({ title: '✓ Horario agregado', description: `${formatHourUTC(addingSlot)} para ${getTimezoneLabel(selectedTz)}` })
        setAddingSlot(null)
        onRefresh()
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo agregar', variant: 'destructive' })
    }
  }

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await fetch('/api/tweets/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !isActive }),
      })
      onRefresh()
    } catch { /* silent */ }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/tweets/schedule?id=${id}`, { method: 'DELETE' })
      toast({ title: 'Eliminado', description: 'Horario eliminado' })
      onRefresh()
    } catch { /* silent */ }
  }

  const filteredSchedules = schedules.filter(s => s.timezone === selectedTz)
  const activeCount = schedules.filter(s => s.isActive).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Horarios de Publicación</h2>
          <p className="text-white/40 text-sm">{activeCount} horarios activos · Zonas: US, UK, EU, AU</p>
        </div>
        {schedules.length === 0 && (
          <Button
            onClick={handleAddDefault}
            className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white border-0"
          >
            <Zap className="w-4 h-4 mr-1" />
            Auto-Config
          </Button>
        )}
      </div>

      {/* Timezone selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {TIMEZONES.map(tz => (
          <button
            key={tz.value}
            onClick={() => setSelectedTz(tz.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              selectedTz === tz.value
                ? 'bg-sky-500/20 border border-sky-500/40 text-white'
                : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'
            }`}
          >
            {tz.label}
          </button>
        ))}
      </div>

      {/* Schedule list for selected timezone */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          {filteredSchedules.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/30 text-sm">No hay horarios para esta zona</p>
              <p className="text-white/20 text-xs mt-1">Agregá horarios o tocá "Auto-Config"</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSchedules.sort((a, b) => a.hourUtc - b.hourUtc).map(slot => (
                <div key={slot.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                    slot.isActive ? 'bg-sky-500/10 text-sky-400' : 'bg-white/5 text-white/20'
                  }`}>
                    {slot.hourUtc.toString().padStart(2, '0')}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${slot.isActive ? 'text-white' : 'text-white/30'}`}>
                      {formatHourUTC(slot.hourUtc)}
                    </p>
                    <p className="text-white/30 text-xs">{formatLocalTime(slot.hourUtc, slot.timezone)}</p>
                  </div>
                  <Switch
                    checked={slot.isActive}
                    onCheckedChange={() => handleToggle(slot.id, slot.isActive)}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white/20 hover:text-red-400 h-8 w-8 p-0"
                    onClick={() => handleDelete(slot.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add custom slot */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <h3 className="text-white font-medium text-sm mb-3">Agregar Horario Manual</h3>
          <div className="flex gap-2">
            <Select value={addingSlot?.toString() ?? ''} onValueChange={v => setAddingSlot(parseInt(v))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white flex-1">
                <SelectValue placeholder="Hora UTC" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 max-h-60">
                {Array.from({ length: 24 }, (_, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {i.toString().padStart(2, '0')}:00 UTC
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddSlot}
              disabled={addingSlot === null}
              className="bg-sky-500 hover:bg-sky-600 text-white border-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timezone Info */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <h3 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-400" />
            Mejores Horarios por Zona
          </h3>
          <div className="space-y-3">
            {TIMEZONES.map(tz => (
              <div key={tz.value} className="flex items-start gap-3">
                <span className="text-sm">{tz.label.split(' ')[0]}</span>
                <div className="flex-1">
                  <p className="text-white/70 text-sm">{tz.label}</p>
                  <p className="text-white/30 text-xs">
                    Horarios pico: {tz.peakHours.map(h => {
                      const localH = h
                      return `${localH.toString().padStart(2, '0')}:00`
                    }).join(', ')} local
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── History Tab ─────────────────────────────────────────────
function HistoryTab({ logs, onRefresh }: { logs: TweetLog[]; onRefresh: () => void }) {
  const [filter, setFilter] = useState<'all' | 'posted' | 'failed'>('all')

  const filtered = filter === 'all' ? logs : logs.filter(l => l.status === filter)
  const totalLikes = logs.reduce((a, l) => a + l.likes, 0)
  const totalRt = logs.reduce((a, l) => a + l.retweets, 0)
  const totalReplies = logs.reduce((a, l) => a + l.replies, 0)
  const totalViews = logs.reduce((a, l) => a + l.views, 0)
  const avgEngagement = logs.length > 0 ? ((totalLikes + totalRt + totalReplies) / logs.length).toFixed(1) : '0'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Historial de Tweets</h2>
          <p className="text-white/40 text-sm">{logs.length} tweets · Eng. promedio: {avgEngagement}</p>
        </div>
        <Button size="sm" variant="ghost" className="text-white/40 h-8 text-xs" onClick={onRefresh}>
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Engagement Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-3 text-center">
            <Heart className="w-4 h-4 text-rose-400 mx-auto mb-1" />
            <p className="text-white font-bold text-lg">{totalLikes.toLocaleString()}</p>
            <p className="text-white/30 text-[10px]">Likes</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-3 text-center">
            <Repeat2 className="w-4 h-4 text-sky-400 mx-auto mb-1" />
            <p className="text-white font-bold text-lg">{totalRt.toLocaleString()}</p>
            <p className="text-white/30 text-[10px]">RTs</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-3 text-center">
            <MessageCircle className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <p className="text-white font-bold text-lg">{totalReplies.toLocaleString()}</p>
            <p className="text-white/30 text-[10px]">Replies</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-3 text-center">
            <Eye className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <p className="text-white font-bold text-lg">{totalViews > 1000 ? `${(totalViews/1000).toFixed(1)}K` : totalViews}</p>
            <p className="text-white/30 text-[10px]">Views</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { value: 'all', label: 'Todos' },
          { value: 'posted', label: '✓ Publicados' },
          { value: 'failed', label: '✗ Fallidos' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as typeof filter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f.value
                ? 'bg-white/10 text-white'
                : 'bg-white/5 text-white/40 hover:bg-white/5'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tweet list */}
      {filtered.length === 0 ? (
        <Card className="bg-white/[0.02] border-white/5">
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">No hay tweets en el historial</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {filtered.map(log => (
            <Card key={log.id} className={`bg-white/[0.03] ${log.status === 'failed' ? 'border-red-500/20' : 'border-white/[0.06]'}`}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    log.status === 'posted' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                  }`}>
                    {log.status === 'posted' ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <X className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/70 text-sm">{log.text}</p>
                    {log.mediaUrl && (
                      <div className="mt-2 w-16 h-16 rounded overflow-hidden border border-white/10">
                        <img src={log.mediaUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge className="bg-white/5 text-white/40 border-0 text-[10px]">
                        {getTimezoneLabel(log.zone)}
                      </Badge>
                      <span className="text-white/20 text-[10px]">
                        {new Date(log.postedAt).toLocaleString('es-AR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {log.status === 'posted' && (
                        <>
                          <span className="text-rose-400/60 text-[10px]">❤️ {log.likes}</span>
                          <span className="text-sky-400/60 text-[10px]">🔄 {log.retweets}</span>
                          <span className="text-purple-400/60 text-[10px]">👁️ {log.views}</span>
                        </>
                      )}
                      {log.status === 'failed' && log.errorMsg && (
                        <span className="text-red-400/60 text-[10px]">Error: {log.errorMsg.substring(0, 50)}</span>
                      )}
                    </div>
                    {log.tweetId && (
                      <a
                        href={`https://twitter.com/i/status/${log.tweetId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sky-400/60 text-[10px] hover:text-sky-400 mt-1"
                      >
                        Ver en Twitter <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Settings Tab ────────────────────────────────────────────
function SettingsTab({ config, onRefresh }: { config: TweetConfig | null; onRefresh: () => void }) {
  const [formData, setFormData] = useState({
    apiKey: '',
    apiSecret: '',
    accessToken: '',
    accessTokenSecret: '',
    postIntervalHours: 3,
    isActive: true,
  })
  const [showKeys, setShowKeys] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testingCron, setTestingCron] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (config) {
      setFormData({
        apiKey: config.apiKey || '',
        apiSecret: config.apiSecret || '',
        accessToken: config.accessToken || '',
        accessTokenSecret: config.accessTokenSecret || '',
        postIntervalHours: config.postIntervalHours || 3,
        isActive: config.isActive,
      })
    }
  }, [config])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/tweets/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        toast({ title: '✓ Configuración guardada', description: 'Los cambios se aplicaron correctamente' })
        onRefresh()
      } else {
        toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleTestCron = async () => {
    setTestingCron(true)
    try {
      const res = await fetch('/api/tweets/cron')
      const data = await res.json()
      toast({
        title: `Cron: ${data.status}`,
        description: data.message || data.error || 'Verificá el resultado',
      })
      onRefresh()
    } catch {
      toast({ title: 'Error', description: 'No se pudo ejecutar el cron', variant: 'destructive' })
    } finally {
      setTestingCron(false)
    }
  }

  const hasKeys = !!(formData.apiKey && formData.apiSecret && formData.accessToken && formData.accessTokenSecret)

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Configuración</h2>

      {/* API Keys */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Twitter className="w-4 h-4 text-sky-400" />
              API Keys de Twitter
            </CardTitle>
            <Badge className={hasKeys ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}>
              {hasKeys ? '✓ Completas' : 'Faltan datos'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-white/40 text-xs">
            Conseguilas gratis en <a href="https://developer.twitter.com" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">developer.twitter.com</a> · Free tier: 1,500 tweets/mes
          </p>

          <div>
            <Label className="text-white/50 text-xs">API Key (Consumer Key)</Label>
            <div className="relative">
              <Input
                type={showKeys ? 'text' : 'password'}
                value={formData.apiKey}
                onChange={e => setFormData(p => ({ ...p, apiKey: e.target.value }))}
                placeholder="xxxxxxxxxxxxxxxxx"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-sky-500 pr-10 text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="text-white/50 text-xs">API Secret (Consumer Secret)</Label>
            <Input
              type={showKeys ? 'text' : 'password'}
              value={formData.apiSecret}
              onChange={e => setFormData(p => ({ ...p, apiSecret: e.target.value }))}
              placeholder="xxxxxxxxxxxxxxxxx"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-sky-500 text-sm"
            />
          </div>

          <div>
            <Label className="text-white/50 text-xs">Access Token</Label>
            <Input
              type={showKeys ? 'text' : 'password'}
              value={formData.accessToken}
              onChange={e => setFormData(p => ({ ...p, accessToken: e.target.value }))}
              placeholder="xxxxxxxxxxxxxxxxx"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-sky-500 text-sm"
            />
          </div>

          <div>
            <Label className="text-white/50 text-xs">Access Token Secret</Label>
            <Input
              type={showKeys ? 'text' : 'password'}
              value={formData.accessTokenSecret}
              onChange={e => setFormData(p => ({ ...p, accessTokenSecret: e.target.value }))}
              placeholder="xxxxxxxxxxxxxxxxx"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-sky-500 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={showKeys} onCheckedChange={setShowKeys} />
            <Label className="text-white/50 text-xs">Mostrar keys</Label>
          </div>
        </CardContent>
      </Card>

      {/* Bot Settings */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Settings className="w-4 h-4 text-purple-400" />
            Configuración del Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">Bot Activo</p>
              <p className="text-white/40 text-xs">Activar/desactivar publicación automática</p>
            </div>
            <Switch
              checked={formData.isActive}
              onCheckedChange={v => setFormData(p => ({ ...p, isActive: v }))}
            />
          </div>

          <div>
            <Label className="text-white/50 text-xs mb-2 block">Intervalo entre tweets (horas)</Label>
            <Select
              value={formData.postIntervalHours.toString()}
              onValueChange={v => setFormData(p => ({ ...p, postIntervalHours: parseInt(v) }))}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                <SelectItem value="1">Cada 1 hora</SelectItem>
                <SelectItem value="2">Cada 2 horas</SelectItem>
                <SelectItem value="3">Cada 3 horas (recomendado)</SelectItem>
                <SelectItem value="4">Cada 4 horas</SelectItem>
                <SelectItem value="6">Cada 6 horas</SelectItem>
                <SelectItem value="8">Cada 8 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white border-0 h-12"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </Button>

        <Button
          onClick={handleTestCron}
          disabled={testingCron}
          variant="outline"
          className="w-full border-white/10 text-white/60 hover:bg-white/5 h-12"
        >
          {testingCron ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
          Test: Publicar Ahora
        </Button>
      </div>

      {/* Help Card */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <h3 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            Cómo conseguir las API Keys
          </h3>
          <ol className="space-y-2 text-white/50 text-xs">
            <li className="flex gap-2">
              <span className="text-sky-400 font-bold">1.</span>
              Andá a <a href="https://developer.twitter.com" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">developer.twitter.com</a> y logueate con la cuenta de Twitter de Olgui
            </li>
            <li className="flex gap-2">
              <span className="text-sky-400 font-bold">2.</span>
              Creá un nuevo proyecto/app (gratis)
            </li>
            <li className="flex gap-2">
              <span className="text-sky-400 font-bold">3.</span>
              En &quot;Keys and Tokens&quot; copiá: API Key, API Secret, Access Token, Access Token Secret
            </li>
            <li className="flex gap-2">
              <span className="text-sky-400 font-bold">4.</span>
              Pegalas acá arriba y guardá
            </li>
            <li className="flex gap-2">
              <span className="text-sky-400 font-bold">5.</span>
              El bot empieza a postear automático en los horarios configurados
            </li>
          </ol>
          <div className="mt-3 p-2 rounded bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-200/60 text-[10px]">
              ⚠️ Free tier: 1,500 tweets/mes (~50/día). Con intervalos de 3hs alcanza perfecto.
              Las keys se guardan localmente, nunca se comparten.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
