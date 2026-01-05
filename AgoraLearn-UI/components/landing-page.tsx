"use client"

import { Button } from "@components/ui/button"
import DarkVeil from '@components/ui/DarkVeil';
import Link from "next/link";
import { MessageSquare, BarChart3, Mic, FileText, Zap, Shield } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen flex flex-col text-white overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <DarkVeil />
      </div>

      {/* Navbar */}
      <header className="container mx-auto px-6 py-6 flex justify-between items-center relative z-10">
        <div className="text-2xl font-bold tracking-tighter">AgoraLearn</div>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-white/80">
          <Link href="#features" className="hover:text-white transition">Features</Link>
          <Link href="#how-it-works" className="hover:text-white transition">How it Works</Link>
        </nav>
        <div className="flex gap-4">
          <Button variant="ghost" className="text-white hover:bg-white/10" asChild>
            <Link href="/sign-up">Log In</Link>
          </Button>
          <Button className="bg-white text-black hover:bg-gray-200" asChild>
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 container mx-auto px-6 flex flex-col items-center justify-center text-center py-20 relative z-10">
        <div className="max-w-3xl space-y-8">
          <div className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-3 py-1 text-sm backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2"></span>
            New: Voice Mode Available
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            Chat with your Data. <br />
            Visualize Insights.
          </h1>
          
          <p className="text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
            AgoraLearn transforms your static documents into an interactive knowledge base. 
            Upload PDFs, ask questions, generate charts, and even talk to your AI assistant.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" className="bg-white text-black hover:bg-gray-200 h-12 px-8 text-lg" asChild>
              <Link href="/register">Start for Free</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/20 bg-white/5 hover:bg-white/10 h-12 px-8 text-lg backdrop-blur-sm" asChild>
              <Link href="#features">Explore Features</Link>
            </Button>
          </div>
        </div>

        {/* Feature Grid */}
        <div id="features" className="grid md:grid-cols-3 gap-8 mt-32 w-full max-w-6xl text-left">
          <FeatureCard 
            icon={<MessageSquare className="w-6 h-6 text-blue-400" />}
            title="Intelligent RAG"
            description="Upload documents and get accurate, context-aware answers instantly using advanced Retrieval-Augmented Generation."
          />
          <FeatureCard 
            icon={<BarChart3 className="w-6 h-6 text-purple-400" />}
            title="Auto-Charting"
            description="Turn data tables into beautiful, interactive charts automatically. Just ask 'Plot this table'."
          />
          <FeatureCard 
            icon={<Mic className="w-6 h-6 text-red-400" />}
            title="Voice Interaction"
            description="Have a natural conversation with your data. Speak to the AI and hear it talk back in real-time."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 border-t border-white/10 text-center text-white/40 text-sm relative z-10">
        © {new Date().getFullYear()} AgoraLearn. All rights reserved.
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition duration-300 backdrop-blur-sm">
      <div className="mb-4 p-3 bg-white/5 rounded-lg w-fit">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-white/60 leading-relaxed">{description}</p>
    </div>
  )
}
