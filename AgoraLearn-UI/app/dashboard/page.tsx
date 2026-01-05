"use client"

import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import Navbar from "@components/navbar"
import { Button } from "@components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card"
import Link from "next/link"
import DarkVeil from '@components/ui/DarkVeil';
import { FileText, Upload, MessageSquare, Clock, HardDrive, Plus, ArrowRight, Trash2 } from "lucide-react"

interface FileItem {
  id: string;
  name: string;
  uploadedAt: string;
  size: string;
  doc_id?: string;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFiles() {
      try {
        if (!supabase) {
          setLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from('files')
          .select('id, name, size, uploaded_at, doc_id')
          .order('uploaded_at', { ascending: false });
          
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
    fetchFiles();
  }, []);

  return (
    <>
      <Navbar />
      <div className="relative min-h-screen text-white">
        <div className="fixed inset-0 -z-10">
          <DarkVeil />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">Dashboard</h1>
              <p className="text-white/60 text-lg">Manage your documents and insights.</p>
            </div>
            <div className="flex gap-3">
              <Button asChild className="bg-white text-black hover:bg-gray-200">
                <Link href="/upload">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload New
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <StatsCard 
              title="Total Documents" 
              value={files.length.toString()} 
              icon={<FileText className="w-5 h-5 text-blue-400" />} 
            />
            <StatsCard 
              title="Storage Used" 
              value={files.length > 0 ? "Active" : "0 MB"} 
              icon={<HardDrive className="w-5 h-5 text-purple-400" />} 
            />
            <StatsCard 
              title="Recent Activity" 
              value={files.length > 0 ? "Just now" : "None"} 
              icon={<Clock className="w-5 h-5 text-green-400" />} 
            />
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Recent Files List (Takes up 2 columns) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Recent Documents</h2>
                <Link href="/upload" className="text-sm text-blue-400 hover:text-blue-300 flex items-center">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : files.length === 0 ? (
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
                      <Upload className="w-8 h-8 text-white/40" />
                    </div>
                    <h3 className="text-xl font-medium mb-2 text-white">No documents yet</h3>
                    <p className="text-white/50 mb-6 max-w-sm">Upload your first document to start generating insights and chatting with your data.</p>
                    <Button asChild variant="outline" className="border-white/20 hover:bg-white/10 text-white">
                      <Link href="/upload">Upload Document</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {files.map((file) => (
                    <div key={file.id} className="group flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/20 rounded-lg">
                          <FileText className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-white group-hover:text-blue-400 transition-colors">{file.name}</h3>
                          <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                            <span>{file.size}</span>
                            <span>•</span>
                            <span>{file.uploadedAt}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-white/20" asChild>
                          <Link href={`/chat?docId=${file.doc_id || file.id}`}>
                            <MessageSquare className="w-4 h-4 text-white/70" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions Sidebar */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Quick Actions</h2>
              <div className="grid gap-4">
                <Link href="/chat">
                  <Card className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-500/30 hover:border-blue-500/50 transition-all cursor-pointer group">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="p-3 bg-blue-500 rounded-full shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                        <MessageSquare className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-lg">Start Chat</h3>
                        <p className="text-white/60 text-sm">Ask questions to AI</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/upload">
                  <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer group">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="p-3 bg-white/10 rounded-full group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-lg">Upload File</h3>
                        <p className="text-white/60 text-sm">Add new documents</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>

              {/* Tips Card */}
              <Card className="bg-white/5 border-white/10 mt-8">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Did you know?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/60 text-sm leading-relaxed">
                    You can now use <strong>Voice Mode</strong> to talk directly to your documents. Just click the headphones icon in the chat!
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
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white/50 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-white">{value}</h3>
        </div>
        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}
