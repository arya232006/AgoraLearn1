"use client"

import { Button } from "@components/ui/button"
import DarkVeil from '@components/ui/DarkVeil';
import Link from "next/link";
import { MessageSquare, BarChart3, Mic, FileText, Zap, Shield, Atom, FlaskConical, Brain, AudioLines, Twitter, Linkedin, Github, CheckCircle2, Mail, ArrowRight, Check } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen flex flex-col text-white overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10 bg-black">
        <DarkVeil />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      </div>

      {/* Navbar */}
      <header className="container mx-auto px-6 py-6 flex justify-between items-center relative z-10 glass-nav">
        <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Atom className="h-5 w-5 text-white" />
            </div>
            <div className="text-2xl font-bold tracking-tighter">AgoraLearn</div>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-medium text-white/80">
          <Link href="#features" className="hover:text-indigo-400 transition">Features</Link>
          <Link href="#lab" className="hover:text-indigo-400 transition">Virtual Lab</Link>
          <Link href="#how-it-works" className="hover:text-indigo-400 transition">How it Works</Link>
        </nav>
        <div className="flex gap-4">
          <Button variant="ghost" className="text-white hover:bg-white/10" asChild>
            <Link href="/sign-up">Log In</Link>
          </Button>
          <Button className="bg-indigo-600 text-white hover:bg-indigo-700 border-0" asChild>
            <Link href="/register">Enter Laboratory</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 container mx-auto px-6 flex flex-col items-center justify-center text-center py-24 relative z-10">
        <div className="max-w-4xl space-y-8 animate-fade-in-up">
          <div className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-indigo-400 mr-2 animate-pulse"></span>
            <span className="text-indigo-200">New: 3D Physics Engine & Audio Lab</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-none text-white pb-2">
            The Future of <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-400">Scientific Learning</span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            An AI-powered research companion that offers 3D simulations, real-time audio analysis, and interactive data visualization.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white h-14 px-8 text-lg rounded-full shadow-lg shadow-indigo-900/20" asChild>
              <Link href="/register">Start Experimenting</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 h-14 px-8 text-lg rounded-full backdrop-blur-md text-white group" asChild>
              <Link href="#features">
                Explore Modules
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Live Interface Preview */}
        <div className="mt-20 relative w-full max-w-5xl mx-auto perspective-1000">
            <div className="relative rounded-xl bg-[#0a0a0a] border border-white/10 shadow-2xl overflow-hidden transform rotate-x-12 hover:rotate-0 transition-all duration-700 ease-out group">
                {/* Window Controls */}
                <div className="h-10 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
                    <div className="flex gap-2">
                         <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                         <div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
                         <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
                    </div>
                    <div className="flex-1 text-center">
                         <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 text-[10px] text-gray-500 font-mono border border-white/5">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                             agoralearn.ai/lab
                         </div>
                    </div>
                </div>
                {/* Content Mockup */}
                <div className="flex h-[400px]">
                    {/* Sidebar */}
                    <div className="w-64 bg-black/20 border-r border-white/5 p-4 space-y-3 hidden md:block">
                        <div className="h-8 bg-indigo-500/10 rounded w-3/4 animate-pulse"></div>
                        <div className="h-4 bg-white/5 rounded w-1/2"></div>
                        <div className="h-4 bg-white/5 rounded w-2/3"></div>
                        <div className="mt-8 h-32 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded border border-white/5 p-3">
                             <div className="w-8 h-8 rounded bg-indigo-500/20 mb-2"></div>
                             <div className="h-3 w-20 bg-white/10 rounded"></div>
                        </div>
                    </div>
                    {/* Chat Area */}
                    <div className="flex-1 bg-[#050505] p-6 relative">
                         <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition duration-500">
                             <div className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-full shadow-lg shadow-indigo-500/20">
                                Simulated Interface
                             </div>
                         </div>
                         <div className="flex flex-col gap-4 max-w-2xl mx-auto mt-8">
                             {/* User Msg */}
                             <div className="self-end bg-indigo-600 text-white px-5 py-3 rounded-2xl rounded-tr-sm max-w-[80%]">
                                 Simulate a projectile motion with launch angle 45° and velocity 20m/s.
                             </div>
                             {/* AI Msg */}
                             <div className="self-start bg-white/5 border border-white/10 text-gray-200 px-5 py-3 rounded-2xl rounded-tl-sm max-w-[90%] space-y-3">
                                 <p>Here is the trajectory simulation. Max height reached: 10.2m.</p>
                                 <div className="h-40 bg-black rounded-lg border border-white/10 relative overflow-hidden flex items-end">
                                      {/* Fake Chart Line */}
                                     <svg className="w-full h-full text-cyan-500" viewBox="0 0 100 50" preserveAspectRatio="none">
                                         <path d="M0,50 Q50,0 100,50" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="100" className="animate-[dash_3s_linear_infinite]" />
                                     </svg>
                                 </div>
                             </div>
                         </div>
                    </div>
                </div>
            </div>
             {/* Glow behind */}
            <div className="absolute -inset-10 bg-indigo-500/20 blur-3xl -z-10 rounded-full opacity-0 group-hover:opacity-100 transition duration-700"></div>
        </div>

        {/* Integrations Marquee */}
        <section className="mt-32 w-full overflow-hidden opacity-80">
            <p className="text-sm font-mono text-gray-500 uppercase tracking-widest mb-8 text-center">Seamlessly Integrated With</p>
            <div className="relative w-full overflow-hidden mask-image-gradient">
                <div className="flex w-max animate-scroll gap-16 items-center">
                    {[
                        "Jupyter Notebook", "Python", "LaTeX", "TensorFlow", "React", "PyTorch", "Overleaf", "Notion", "Slack", "VS Code",
                        "Jupyter Notebook", "Python", "LaTeX", "TensorFlow", "React", "PyTorch", "Overleaf", "Notion", "Slack", "VS Code"
                    ].map((item, i) => (
                        <span key={i} className="text-xl font-bold text-gray-500 whitespace-nowrap">{item}</span>
                    ))}
                </div>
            </div>
        </section>

        {/* Stats Section */}
        <section className="mt-20 w-full max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center bg-white/5 border border-white/5 rounded-3xl py-12 backdrop-blur-md">
                <StatItem number="15k+" label="Researchers" />
                <StatItem number="1.2M" label="Simulations Run" />
                <StatItem number="500k" label="Papers Indexed" />
                <StatItem number="99.9%" label="Uptime" />
            </div>
        </section>

        {/* Comparison: Old vs New */}
        <section className="mt-40 w-full max-w-6xl px-6">
            <h2 className="text-3xl md:text-5xl font-bold text-center mb-16">Why switch to AgoraLearn?</h2>
            <div className="grid md:grid-cols-2 gap-8">
                {/* The Old Way */}
                <div className="p-8 rounded-3xl bg-red-500/5 border border-red-500/10 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-6">
                         <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 font-bold">✕</div>
                         <h3 className="text-xl font-bold text-red-200">The Traditional Way</h3>
                    </div>
                    <ul className="space-y-4 text-gray-400">
                        <li className="flex gap-3"><span className="text-red-500/50">•</span>Manual data cleaning in Excel</li>
                        <li className="flex gap-3"><span className="text-red-500/50">•</span>Static 2D textbook diagrams</li>
                        <li className="flex gap-3"><span className="text-red-500/50">•</span>Hours spent formatting LaTeX citations</li>
                        <li className="flex gap-3"><span className="text-red-500/50">•</span>Disconnected tools and lost files</li>
                    </ul>
                </div>

                {/* The AgoraLearn Way */}
                <div className="p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 backdrop-blur-sm relative overflow-hidden">
                     <div className="absolute inset-0 bg-emerald-500/5 blur-3xl opacity-50"></div>
                     <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-emerald-200">The AgoraLearn Way</h3>
                        </div>
                        <ul className="space-y-4 text-gray-300">
                            <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500/80 shrink-0"/>AI-driven data cleaning & plotting</li>
                            <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500/80 shrink-0"/>Interactive 3D simulations</li>
                            <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500/80 shrink-0"/>Auto-generated citations & reports</li>
                            <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500/80 shrink-0"/>All-in-one digital laboratory</li>
                        </ul>
                     </div>
                </div>
            </div>
        </section>

        {/* Feature Grid */}
        <div id="features" className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-32 w-full max-w-7xl text-left">
          <FeatureCard 
            icon={<Atom className="w-6 h-6 text-cyan-400" />}
            title="3D Simulation Engine"
            description="Visualize complex concepts with interactive 3D models. From molecular structures to projectile physics, see science come to life."
          />
          <FeatureCard 
            icon={<FlaskConical className="w-6 h-6 text-purple-400" />}
            title="AI Lab Assistant"
            description="Your personal research partner. Analyze experimental data, calculate regressions, and generate lab reports instantly."
          />
           <FeatureCard 
            icon={<AudioLines className="w-6 h-6 text-emerald-400" />}
            title="Acoustic Analysis"
            description="Real-time audio visualization and frequency analysis for physics experiments and sound wave study."
          />
          <FeatureCard 
            icon={<BarChart3 className="w-6 h-6 text-orange-400" />}
            title="Smart Data Plotting"
            description="Convert raw CSVs or messy tables into professional charts with error analysis and linear regression built-in."
          />
          <FeatureCard 
            icon={<Brain className="w-6 h-6 text-pink-400" />}
            title="Adaptive Testing"
            description="Test your understanding with AI-generated quizzes that adapt to your document's content and difficulty level."
          />
          <FeatureCard 
            icon={<FileText className="w-6 h-6 text-blue-400" />}
            title="Experiment Journal"
            description="Keep track of your findings. Save charts, simulations, and conversations to your personal digital lab notebook."
          />
        </div>

        {/* Benefits Section */}
        <section className="mt-40 w-full max-w-7xl px-6">
            <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 rounded-[3rem] p-8 md:p-16 border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
                    <div className="space-y-8">
                        <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                            Accelerate your research <br/>
                            <span className="text-indigo-400">by a factor of 10x</span>
                        </h2>
                        <p className="text-xl text-gray-400 leading-relaxed">
                            Stop spending hours on data cleaning and formatting. AgoraLearn automates the tedious parts of scientific inquiry so you can focus on the breakthrough moments.
                        </p>
                        <ul className="space-y-4">
                            {[
                                "Instant citation generation",
                                "Auto-generated LaTeX equations",
                                "Real-time peer review simulation",
                                "Export to Jupyter Notebooks",
                                "Cloud-synced lab notebook"
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-lg text-gray-300">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-2xl transform rotate-3"></div>
                        <div className="bg-black/90 border border-white/10 rounded-2xl p-6 relative transform -rotate-2 hover:rotate-0 transition duration-500 shadow-2xl">
                             <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
                                 <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold">AI</div>
                                 <div>
                                     <div className="font-bold">Research Assistant</div>
                                     <div className="text-xs text-green-400">Online • v2.4.0</div>
                                 </div>
                             </div>
                             <div className="space-y-4 font-mono text-sm">
                                 <div className="bg-white/5 p-3 rounded-lg border border-white/5 text-gray-300">
                                     Processing 14,000 data points from 'experiment_alpha.csv'...
                                 </div>
                                 <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 text-emerald-300">
                                     ✓ Correlation found: Temperature vs. Conductivity (r=0.94)
                                 </div>
                                 <div className="bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20 text-indigo-300">
                                     Generating plot... [||||||||||] 100%
                                 </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="mt-40 w-full max-w-7xl">
            <h2 className="text-3xl md:text-5xl font-bold text-center mb-16 bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-white to-indigo-200">
                Scientific Method, Reimagined
            </h2>
            
            <div className="grid md:grid-cols-3 gap-12 relative">
                {/* Connecting Line */}
                <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>

                <StepStep 
                    number="01" 
                    title="Upload Data" 
                    desc="Input your research papers, raw CSV data, or problem statements directly into the secure portal." 
                />
                <StepStep 
                    number="02" 
                    title="Analyze & Simulate" 
                    desc="Use the AI to run physics simulations, plotting regressions, or acoustical analysis on your inputs." 
                />
                <StepStep 
                    number="03" 
                    title="Synthesize Results" 
                    desc="Generate comprehensive lab reports, export charts, and save your discoveries to your journal." 
                />
            </div>
        </section>

        {/* Use Cases Section */}
        <section className="mt-40 w-full max-w-6xl text-center">
            <div className="p-1 rounded-3xl bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20">
                <div className="bg-black/80 backdrop-blur-xl rounded-[22px] p-12 border border-white/5">
                    <h2 className="text-3xl font-bold mb-8">Perfect for Modern Research</h2>
                    <div className="grid md:grid-cols-2 gap-8 text-left">
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-indigo-300">Physics Students</h3>
                            <p className="text-gray-400">Visualize projectile motion, optics, and wave interference in real-time. No more abstract theorizing—see the math happen.</p>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-purple-300">Data Scientists</h3>
                            <p className="text-gray-400">Instantly clean messy data tables and find correlations. Generate linear, exponential, or polynomial regression models with one click.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Testimonials */}
        <section className="mt-32 w-full max-w-7xl px-6">
            <h2 className="text-3xl font-bold text-center mb-12">Built for the Curious</h2>
            <div className="grid md:grid-cols-3 gap-6">
                 <TestimonialCard 
                    quote="The 3D visualizations helped me understand orbital mechanics in a way no textbook ever could."
                    author="Sarah J."
                    role="Physics Undergrad"
                 />
                  <TestimonialCard 
                    quote="I use the AI Chart Generator to clean my lab data instantly. It saves me hours of Excel work every week."
                    author="Dr. Hemant R."
                    role="Research Associate"
                 />
                 <TestimonialCard 
                    quote="Being able to 'talk' to my research papers while commuting is a game changer for my productivity."
                    author="Marcus L."
                    role="PhD Candidate"
                 />
            </div>
        </section>

        {/* Pricing Section */}
        <section className="mt-40 w-full max-w-7xl px-6">
            <h2 className="text-3xl md:text-5xl font-bold text-center mb-16 bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-white to-indigo-200">
                Plans for Every Scientist
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
                <PricingCard 
                    tier="Student" 
                    price="$0" 
                    features={["Basic Physics Simulations", "5 Document Uploads/mo", "Community Support", "Standard GPT-3.5 Model"]} 
                    active={false}
                />
                <PricingCard 
                    tier="Researcher" 
                    price="$19" 
                    period="/mo"
                    features={["Advanced 3D Engine", "Unlimited Uploads", "Priority Support", "GPT-4 & Gemini Pro", "Export to LaTeX"]} 
                    active={true}
                    badge="Most Popular"
                />
                <PricingCard 
                    tier="Lab Team" 
                    price="$99" 
                    period="/mo"
                    features={["Multi-user Dashboard", "API Access", "Dedicated Server Resource", "Custom Model Fine-tuning", "SSO Authentication"]} 
                    active={false}
                />
            </div>
        </section>

        {/* FAQ Section */}
        <section className="mt-32 w-full max-w-3xl px-6">
            <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
            <div className="space-y-4">
                <FaqItem 
                    question="Is AgoraLearn free for students?" 
                    answer="Yes! We offer a generous free tier for academic use, which includes basic simulations and document analysis." 
                />
                <FaqItem 
                    question="Can I upload my own lab data?" 
                    answer="Absolutely. You can upload CSV, Excel, or PDF files. Our AI cleans the data and suggests relevant visualizations." 
                />
                <FaqItem 
                    question="How accurate are the physics simulations?" 
                    answer="Our 3D engine uses industry-standard physics libraries verified against real-world constants for educational accuracy." 
                />
            </div>
        </section>

        {/* CTA Section */}
        <section className="mt-32 w-full text-center pb-20">
             <h2 className="text-4xl font-bold mb-6">Ready to enter the lab?</h2>
             <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">Join thousands of students and researchers using AgoraLearn to accelerate their discovery process.</p>
             <Button size="lg" className="bg-white text-black hover:bg-gray-200 h-14 px-10 text-lg rounded-full shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.5)] transition-shadow duration-500" asChild>
                <Link href="/register">Get Started for Free</Link>
             </Button>
        </section>

        {/* Newsletter Section */}
        <section className="w-full max-w-4xl mx-auto px-6 mb-20">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-12 text-center backdrop-blur-md">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 mb-6">
                    <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Stay in the loop</h3>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">Get the latest updates on new physics modules, AI features, and research tools delivered to your inbox.</p>
                <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
                    <input 
                        type="email" 
                        placeholder="Enter your email" 
                        className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition"
                    />
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6">
                        Subscribe
                    </Button>
                </form>
            </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-12 border-t border-white/5 text-center text-gray-500 text-sm relative z-10">
        <div className="grid md:grid-cols-4 gap-8 mb-12 text-left">
            <div>
                <div className="flex items-center gap-2 mb-4 text-white">
                    <Atom className="h-4 w-4" />
                    <span className="font-bold">AgoraLearn</span>
                </div>
                <p className="text-xs leading-relaxed opacity-60">Empowering the next generation of scientists with AI-driven tools.</p>
            </div>
            <div>
                 <h4 className="font-bold text-white mb-4">Platform</h4>
                 <ul className="space-y-2 text-xs">
                     <li><Link href="#features" className="hover:text-indigo-400">Features</Link></li>
                     <li><Link href="/pricing" className="hover:text-indigo-400">Pricing</Link></li>
                     <li><Link href="/university" className="hover:text-indigo-400">For Universities</Link></li>
                 </ul>
            </div>
            <div>
                 <h4 className="font-bold text-white mb-4">Resources</h4>
                 <ul className="space-y-2 text-xs">
                     <li><Link href="/docs" className="hover:text-indigo-400">Documentation</Link></li>
                     <li><Link href="/blog" className="hover:text-indigo-400">Research Blog</Link></li>
                     <li><Link href="/community" className="hover:text-indigo-400">Community</Link></li>
                 </ul>
            </div>
             <div>
                 <h4 className="font-bold text-white mb-4">Legal</h4>
                 <ul className="space-y-2 text-xs">
                     <li><Link href="/privacy" className="hover:text-indigo-400">Privacy Policy</Link></li>
                     <li><Link href="/terms" className="hover:text-indigo-400">Terms of Service</Link></li>
                 </ul>
            </div>
        </div>
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <span>© {new Date().getFullYear()} AgoraLearn Scientific.</span>
            <div className="flex gap-4">
                 <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 hover:text-indigo-400 cursor-pointer transition">
                    <Twitter className="w-4 h-4" />
                 </div>
                 <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 hover:text-indigo-400 cursor-pointer transition">
                    <Linkedin className="w-4 h-4" />
                 </div>
                 <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 hover:text-indigo-400 cursor-pointer transition">
                    <Github className="w-4 h-4" />
                 </div>
            </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/[0.07] hover:border-indigo-500/30 transition duration-500 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition duration-500"></div>
      <div className="mb-6 p-4 bg-white/5 rounded-2xl w-fit group-hover:scale-110 transition duration-500 relative z-10 border border-white/5">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white group-hover:text-indigo-300 transition relative z-10">{title}</h3>
      <p className="text-gray-400 leading-relaxed relative z-10 group-hover:text-gray-300 transition">{description}</p>
    </div>
  )
}

function StepStep({ number, title, desc }: { number: string, title: string, desc: string }) {
    return (
        <div className="relative flex flex-col items-center text-center group">
            <div className="w-24 h-24 rounded-full bg-black border border-white/10 flex items-center justify-center mb-6 relative z-10 group-hover:border-indigo-500/50 transition duration-500 shadow-2xl">
                <div className="absolute inset-0 bg-indigo-500/20 blur-xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
                <span className="text-3xl font-bold text-white/20 group-hover:text-white transition duration-500">{number}</span>
            </div>
            <h3 className="text-xl font-bold mb-3">{title}</h3>
            <p className="text-gray-400 leading-relaxed max-w-xs">{desc}</p>
        </div>
    )
}

function TestimonialCard({ quote, author, role }: { quote: string, author: string, role: string }) {
    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition duration-300 backdrop-blur-md">
            <div className="flex gap-1 mb-4">
                {[1,2,3,4,5].map(i => <div key={i} className="w-1 h-1 rounded-full bg-indigo-500"></div>)}
            </div>
            <p className="text-lg text-gray-300 mb-6 font-light italic">"{quote}"</p>
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500"></div>
                <div>
                    <div className="text-sm font-bold text-white">{author}</div>
                    <div className="text-xs text-indigo-300">{role}</div>
                </div>
            </div>
        </div>
    )
}

function StatItem({ number, label }: { number: string, label: string }) {
    return (
        <div>
            <div className="text-3xl md:text-4xl font-bold text-white mb-2">{number}</div>
            <div className="text-sm text-gray-400 uppercase tracking-widest">{label}</div>
        </div>
    )
}

function FaqItem({ question, answer }: { question: string, answer: string }) {
    return (
        <div className="group rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition duration-300 overflow-hidden">
            <details className="peer group p-6 cursor-pointer">
                <summary className="list-none flex justify-between items-center font-medium text-white group-hover:text-indigo-300 transition">
                    {question}
                    <span className="text-white/50 group-open:rotate-180 transition-transform duration-300">▼</span>
                </summary>
            </details>
            <div className="px-6 pb-6 text-gray-400 text-sm leading-relaxed hidden peer-open:block animate-in fade-in slide-in-from-top-2">
                {answer}
            </div>
        </div>
    )
}

function PricingCard({ tier, price, period = "", features, active, badge }: { tier: string, price: string, period?: string, features: string[], active: boolean, badge?: string }) {
    return (
        <div className={`relative p-8 rounded-3xl border flex flex-col ${active ? 'bg-white/10 border-indigo-500 shadow-2xl shadow-indigo-900/20' : 'bg-white/5 border-white/10 hover:border-white/20'} transition duration-500`}>
            {badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{badge}</div>
            )}
            <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-400 mb-2">{tier}</h3>
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">{price}</span>
                    <span className="text-gray-500">{period}</span>
                </div>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
                {features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                        <Check className={`w-5 h-5 shrink-0 ${active ? 'text-indigo-400' : 'text-gray-500'}`} />
                        {feat}
                    </li>
                ))}
            </ul>
            <Button className={`w-full h-12 rounded-xl text-sm font-bold ${active ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                {active ? 'Get Started' : 'Choose Plan'}
            </Button>
        </div>
    )
}
