
"use client"
import React from "react"
import { useState } from "react"
import Navbar from "@components/navbar"
import { Button } from "@components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card"
import { Alert, AlertDescription } from "@components/ui/alert"
import { CheckCircle2, Upload, X, FileText, FlaskConical, Atom } from "lucide-react"
import DarkVeil from '@components/ui/DarkVeil';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  // ... (rest of logic)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileSelect = (file: File) => {
    setUploadedFile(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleUpload = async () => {
    if (!uploadedFile) return

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", uploadedFile)

      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
      const response = await fetch(`${apiBase}/api/upload`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.ok) {
        setShowSuccess(true)
        setUploadedFile(null)
        // Redirect to chat with docId after brief delay
        if (data.docId) {
             setTimeout(() => router.push(`/chat?docId=${data.docId}`), 1000)
        } else {
             setTimeout(() => setShowSuccess(false), 5000)
        }
      }
    } catch (error) {
      console.error("Upload failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="relative min-h-screen text-white">
        <div className="fixed inset-0 -z-10 bg-[#0a0a0a]">
          <DarkVeil />
        </div>
        
        <div className="max-w-4xl mx-auto px-6 py-16 flex flex-col md:flex-row gap-12">
          
          {/* Left Panel: Context */}
          <div className="flex-1 space-y-6">
              <div>
                <h1 className="text-4xl font-bold tracking-tight mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                    Upload Data
                </h1>
                <p className="text-lg text-gray-400 leading-relaxed">
                    Import your research materials to the secure AgoraLearn environment. Supported formats include PDF, DOCX, and CSV for data analysis.
                </p>
              </div>

              <div className="grid gap-4">
                  <FeatureItem 
                    icon={<FileText className="w-5 h-5 text-indigo-400" />} 
                    title="Smart Processing" 
                    desc="Automatic text extraction and chunking for efficient RAG retrieval." 
                  />
                  <FeatureItem 
                    icon={<FlaskConical className="w-5 h-5 text-emerald-400" />} 
                    title="Lab Ready" 
                    desc="Visualizes data tables automatically independently of the file format." 
                  />
                  <FeatureItem 
                    icon={<Atom className="w-5 h-5 text-cyan-400" />} 
                    title="Context Aware" 
                    desc="Generates quizzes and simulations based on specific document content." 
                  />
              </div>
          </div>

          {/* Right Panel: Upload Box */}
          <div className="flex-1">
            {/* Success Alert */}
            {showSuccess && (
                <div className="mb-4 p-4 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                    <span className="text-green-200 font-medium">File uploaded successfully! Redirecting...</span>
                </div>
            )}

            <Card className="bg-white/[0.03] border-white/10 backdrop-blur-md shadow-2xl">
                <CardHeader>
                <CardTitle className="text-white">Select Document</CardTitle>
                <CardDescription className="text-gray-400">Drag and drop or browse to upload</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                
                {/* Drag and Drop Area */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                        relative overflow-hidden group border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 cursor-pointer
                        ${isDragging 
                            ? "border-indigo-500 bg-indigo-500/10 scale-[1.02]" 
                            : "border-white/10 hover:border-indigo-500/50 hover:bg-white/[0.02]"
                        }
                    `}
                >
                    <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col items-center">
                        <div className={`p-4 rounded-full bg-white/5 mb-4 transition-transform duration-300 ${isDragging ? "scale-110 bg-indigo-500/20" : "group-hover:scale-110"}`}>
                            <Upload className={`h-8 w-8 ${isDragging ? "text-indigo-400" : "text-gray-400"}`} />
                        </div>
                        <p className="font-medium text-white mb-1">Drag file here</p>
                        <p className="text-sm text-gray-500 mb-4">or click to browse</p>
                        
                        <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileInputChange}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.txt,.md"
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            className="bg-white/10 hover:bg-white/20 text-white border-0"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Browse Files
                        </Button>
                    </div>
                </div>

                {/* Selected File */}
                {uploadedFile && (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded">
                            <FileText className="h-4 w-4 text-indigo-400" />
                        </div>
                        <div>
                            <p className="font-medium text-white text-sm">{uploadedFile.name}</p>
                            <p className="text-xs text-indigo-300">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    </div>
                    <button onClick={() => setUploadedFile(null)} className="text-gray-400 hover:text-white transition p-1 hover:bg-white/10 rounded">
                        <X className="h-4 w-4" />
                    </button>
                    </div>
                )}

                {/* Upload Button */}
                <Button 
                    onClick={handleUpload} 
                    disabled={!uploadedFile || isLoading} 
                    size="lg" 
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium h-12 shadow-lg shadow-indigo-900/20"
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Processing Document...</span>
                        </div>
                    ) : "Upload & Analyze"}
                </Button>
                </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition duration-300 border border-transparent hover:border-white/5">
            <div className="mt-1 p-2 rounded-lg bg-white/5 border border-white/5">
                {icon}
            </div>
            <div>
                <h3 className="font-semibold text-white text-sm mb-1">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
        </div>
    )
}
