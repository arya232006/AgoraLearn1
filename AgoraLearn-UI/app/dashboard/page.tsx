"use client"

import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import Navbar from "@components/navbar"
import { Button } from "@components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card"
import Link from "next/link"
import DarkVeil from '@components/ui/DarkVeil';
import {
  FileText,
  Upload,
  MessageSquare,
  Clock,
  HardDrive,
  Plus,
  ArrowRight,
  Trash2,
  FlaskConical,
  Atom,
  Brain,
  Microscope,
  LineChart,
  Search,
  Star,
  Zap
} from "lucide-react"

interface FileItem {
  id: string;
  name: string;
  uploadedAt: string;
  size: string;
  doc_id?: string;
}

interface ExperimentItem {
  id: string;
  title: string;
  date: string;
  type: 'chart' | 'simulation' | 'quiz';
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function Dashboard() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [experiments, setExperiments] = useState<ExperimentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);


  useEffect(() => {
    // 1. Fetch Files from Supabase
    async function fetchFiles() {
      try {
        if (!supabase) {
          setLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from('files')
          .select('id, name, size, uploaded_at, doc_id')
          .order('uploaded_at', { ascending: false })
          .limit(5); // limit to 5 for dashboard

        if (error) throw error;

        const filesList: FileItem[] = (data || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          uploadedAt: row.uploaded_at ? new Date(row.uploaded_at).toLocaleDateString() : 'Unknown date',
          size: row.size ? formatBytes(row.size) : 'Unknown size',
          doc_id: row.doc_id
        }));
        setFiles(filesList);
      } catch (err) {
        console.error('[DASHBOARD] Error:', err);
      } finally {
        setLoading(false);
      }
    }

    // 2. Fetch Experiments from LocalStorage
    try {
      const savedJournal = localStorage.getItem('agoralearn:journal');
      if (savedJournal) {
        const journal = JSON.parse(savedJournal);
        setExperiments(journal.slice(0, 3).map((entry: any) => ({
          id: entry.id,
          title: entry.title || "Untitled Experiment",
          date: new Date(entry.timestamp).toLocaleDateString(),
          type: entry.type === '3d' ? 'simulation' : 'chart'
        })));
      }

      // Load Favorites
      const savedFavs = localStorage.getItem('agoralearn:favorites');
      if (savedFavs) setFavorites(JSON.parse(savedFavs));

      // Load Activity
      const { getRecentActivity } = require('../lib/activity-tracker');
      const recent = getRecentActivity(10);
      setActivityLog(recent);

    } catch (e) { console.error("Error loading local data", e); }

    fetchFiles();
  }, []);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newFavs = favorites.includes(id)
      ? favorites.filter(fid => fid !== id)
      : [...favorites, id];

    setFavorites(newFavs);
    localStorage.setItem('agoralearn:favorites', JSON.stringify(newFavs));
  };

  const filteredFiles = files.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFav = showFavoritesOnly ? favorites.includes(f.id) : true;
    return matchesSearch && matchesFav;
  });

  return (
    <>
      <Navbar />
      <div className="relative min-h-screen text-white/90 font-sans selection:bg-indigo-500/30">
        <div className="fixed inset-0 -z-10 bg-[#0a0a0a]">
          <DarkVeil />
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Header Section */}
          {/* Header Section with Search */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 border-b border-white/5 pb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                Lab Dashboard
              </h1>
              <div className="flex items-center gap-2 text-indigo-400/80 text-xs font-mono uppercase tracking-wider">
                <Microscope className="w-3 h-3" />
                <span>Scientific Workspace Active</span>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-md mx-4 relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search documents & experiments..."
                className="w-full bg-white/[0.05] border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <Button asChild className="bg-white text-black hover:bg-gray-200">
                <Link href="/upload">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Link>
              </Button>
            </div>
          </div>

          {/* Hero Prompt Section */}
          <div className="mb-12">
            <h2 className="text-xl text-white/80 mb-6 font-light">What would you like to do today?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/upload" className="group p-6 bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border border-blue-500/20 rounded-2xl hover:border-blue-400/50 transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                <div className="bg-blue-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <LineChart className="w-6 h-6 text-blue-300" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Analyze Data</h3>
                <p className="text-sm text-blue-200/60 mb-4">Upload datasets or papers to generate insights and charts.</p>
                <div className="flex items-center text-xs font-bold text-blue-300 uppercase tracking-widest group-hover:gap-2 transition-all">
                  Start <ArrowRight className="w-3 h-3 ml-1" />
                </div>
              </Link>

              <Link href="/chat" className="group p-6 bg-gradient-to-br from-purple-500/20 to-pink-600/20 border border-purple-500/20 rounded-2xl hover:border-purple-400/50 transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                <div className="bg-purple-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-6 h-6 text-purple-300" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Chat Assistant</h3>
                <p className="text-sm text-purple-200/60 mb-4">Ask complex questions about your documents or concepts.</p>
                <div className="flex items-center text-xs font-bold text-purple-300 uppercase tracking-widest group-hover:gap-2 transition-all">
                  Chat <ArrowRight className="w-3 h-3 ml-1" />
                </div>
              </Link>

              <Link href="/chat" className="group p-6 bg-gradient-to-br from-cyan-500/20 to-teal-600/20 border border-cyan-500/20 rounded-2xl hover:border-cyan-400/50 transition-all hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]">
                <div className="bg-cyan-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Atom className="w-6 h-6 text-cyan-300" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Run Simulation</h3>
                <p className="text-sm text-cyan-200/60 mb-4">Visualize physics, chemistry, and orbits in 3D.</p>
                <div className="flex items-center text-xs font-bold text-cyan-300 uppercase tracking-widest group-hover:gap-2 transition-all">
                  Launch <ArrowRight className="w-3 h-3 ml-1" />
                </div>
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <StatsCard
              title="Documents Analyzed"
              value={files.length.toString()}
              icon={<FileText className="w-5 h-5 text-blue-400" />}
            />
            <StatsCard
              title="Simulations Run"
              value={experiments.filter(e => e.type === 'simulation').length.toString()}
              icon={<Atom className="w-5 h-5 text-cyan-400" />}
            />
            <StatsCard
              title="Charts Generated"
              value={experiments.filter(e => e.type === 'chart').length.toString()}
              icon={<LineChart className="w-5 h-5 text-emerald-400" />}
            />
            <StatsCard
              title="Lab Usage"
              value="Active"
              icon={<Clock className="w-5 h-5 text-purple-400" />}
            />
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left Column: Recent Work (2 cols) */}
            <div className="lg:col-span-2 space-y-8">

              {/* Recent Files */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2 text-white/90">
                      <FileText className="w-5 h-5 text-indigo-500" />
                      Recent Documents
                    </h2>
                    {/* Favorites Filter */}
                    <button
                      onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${showFavoritesOnly ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-300' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                    >
                      <Star className={`w-3 h-3 ${showFavoritesOnly ? 'fill-yellow-300' : ''}`} />
                      Favorites
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <EmptyState
                    icon={<FileText className="w-8 h-8 text-white/20" />}
                    title={searchQuery ? "No matching documents" : "No documents yet"}
                    desc={searchQuery ? "Try a different search term" : "Upload research papers or data sheets to get started."}
                    actionLink="/upload"
                    actionText="Upload PDF"
                  />
                ) : (
                  <div className="grid gap-3">
                    {filteredFiles.map((file) => (
                      <div key={file.id} className="group relative overflow-hidden flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/[0.06] hover:border-indigo-500/20 transition-all duration-300">
                        <div className="flex items-center gap-4 relative z-10">
                          <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/10 group-hover:border-indigo-500/30 transition-colors">
                            <FileText className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white/90 text-sm group-hover:text-indigo-300 transition-colors flex items-center gap-2">
                              {file.name}
                              {favorites.includes(file.id) && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                            </h3>
                            <div className="flex items-center gap-3 text-xs text-white/40 mt-1 font-mono">
                              <span>{file.size}</span>
                              <span className="w-1 h-1 rounded-full bg-white/20"></span>
                              <span>{file.uploadedAt}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Star Button */}
                          <button
                            onClick={(e) => toggleFavorite(file.id, e)}
                            className={`p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100 ${favorites.includes(file.id) ? 'text-yellow-400 opacity-100' : 'text-white/20 hover:text-yellow-400 hover:bg-white/10'}`}
                          >
                            <Star className={`w-4 h-4 ${favorites.includes(file.id) ? 'fill-yellow-400' : ''}`} />
                          </button>

                          <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-500/20 hover:text-indigo-300" asChild>
                            <Link href={`/chat?docId=${file.doc_id || file.id}`}>
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Recent Experiments (Journal) */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold flex items-center gap-2 text-white/90">
                    <FlaskConical className="w-5 h-5 text-emerald-500" />
                    Lab Journal
                  </h2>
                </div>

                {experiments.length === 0 ? (
                  <EmptyState
                    icon={<FlaskConical className="w-8 h-8 text-white/20" />}
                    title="Lab journal empty"
                    desc="Run simulations or generate charts to save them here."
                    actionLink="/chat"
                    actionText="Go to Lab"
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {experiments.map((exp) => (
                      <Link key={exp.id} href="/chat" className="group block">
                        <div className="h-full p-5 bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5 rounded-xl hover:border-emerald-500/30 hover:from-emerald-900/10 transition-all">
                          <div className="flex items-start justify-between mb-3">
                            <div className={`p-2 rounded-lg ${exp.type === 'simulation' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                              {exp.type === 'simulation' ? <Atom className="w-4 h-4" /> : <LineChart className="w-4 h-4" />}
                            </div>
                            <span className="text-[10px] uppercase tracking-wider text-white/30 font-bold">{exp.type}</span>
                          </div>
                          <h3 className="text-sm font-medium text-white/80 group-hover:text-white line-clamp-2 mb-2">{exp.title}</h3>
                          <p className="text-xs text-white/40 font-mono">{exp.date}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

            </div>

            {/* Right Column: Quick Actions & Tips */}
            <div className="space-y-6">

              {/* Recent Activity Timeline */}
              {activityLog.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-white/90 mb-6">Recent Activity</h2>
                  <div className="relative border-l border-white/10 ml-3 space-y-6 pl-6 pb-2">
                    {activityLog.map((act, i) => (
                      <div key={i} className="relative">
                        <div className={`absolute -left-[31px] top-0.5 h-6 w-6 rounded-full border-2 border-[#0a0a0a] flex items-center justify-center ${act.type === 'upload' ? 'bg-indigo-500 text-white' :
                          act.type === 'simulation' ? 'bg-cyan-500 text-black' :
                            act.type === 'quiz' ? 'bg-pink-500 text-white' : 'bg-gray-600'
                          }`}>
                          {act.type === 'upload' && <Upload className="w-3 h-3" />}
                          {act.type === 'simulation' && <Atom className="w-3 h-3" />}
                          {act.type === 'chat' && <MessageSquare className="w-3 h-3" />}
                          {act.type === 'quiz' && <Brain className="w-3 h-3" />}
                        </div>
                        <p className="text-sm font-medium text-white/90">{act.title}</p>
                        <p className="text-xs text-white/40">{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h2 className="text-xl font-semibold text-white/90 mb-6">Quick Actions</h2>
              <div className="grid gap-3">
                <ActionCard
                  title="Launch Physics Engine"
                  desc="3D Simulations & Models"
                  icon={<Atom className="w-5 h-5 text-cyan-200" />}
                  color="bg-cyan-600"
                  href="/chat"
                />
                <ActionCard
                  title="Data Analysis"
                  desc="Upload & Plot Charts"
                  icon={<LineChart className="w-5 h-5 text-emerald-200" />}
                  color="bg-emerald-600"
                  href="/upload"
                />
                <ActionCard
                  title="Take a Quiz"
                  desc="Test your knowledge"
                  icon={<Brain className="w-5 h-5 text-pink-200" />}
                  color="bg-pink-600"
                  href="/chat"
                />
              </div>

              {/* Tips Card */}
              <Card className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border-indigo-500/30 overflow-hidden relative mt-8">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Atom className="w-24 h-24" />
                </div>
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Microscope className="w-4 h-4 text-cyan-400" />
                    Lab Tip
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-indigo-100/70 text-sm leading-relaxed relative z-10">
                    Try generating an <strong>AI Quiz</strong> from your documents to test your retention. Just ask <em>"Create a quiz about this"</em> in the chat.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function StatsCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <Card className="bg-white/[0.03] border-white/5 backdrop-blur-sm hover:bg-white/[0.05] transition-colors">
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-white/40 mb-1 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-white/90">{value}</h3>
        </div>
        <div className="p-3 bg-white/[0.05] rounded-xl border border-white/5">
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}

function ActionCard({ title, desc, icon, color, href }: { title: string, desc: string, icon: React.ReactNode, color: string, href: string }) {
  return (
    <Link href={href}>
      <div className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.07] transition-all cursor-pointer">
        <div className={`p-3 rounded-lg ${color} bg-opacity-20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-white/90 group-hover:text-white transition-colors">{title}</h3>
          <p className="text-xs text-white/50 group-hover:text-white/70 transition-colors">{desc}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-white/20 ml-auto group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  )
}

function EmptyState({ icon, title, desc, actionLink, actionText }: { icon: React.ReactNode, title: string, desc: string, actionLink: string, actionText: string }) {
  return (
    <Card className="bg-white/[0.02] border-white/5 border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-white/[0.05] rounded-full flex items-center justify-center mb-4">
          {icon}
        </div>
        <h3 className="text-lg font-medium mb-1 text-white/80">{title}</h3>
        <p className="text-white/40 mb-6 max-w-xs text-sm">{desc}</p>
        <Button asChild variant="outline" className="border-white/10 hover:bg-white/5 text-white bg-transparent">
          <Link href={actionLink}>{actionText}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
