import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart3,
    Users,
    Wallet,
    Calendar,
    Shield,
    TrendingUp,
    Globe,
    Headphones,
    ArrowRight,
    CheckCircle2,
    Zap,
    PieChart,
    Star,
    ChevronRight,
    Menu,
    X,
    Plane,
    MapPin,
    CreditCard,
    UserCheck,
    FileText,
    Settings
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import './landing.css';

/* ──────────────────────────────────────
   Scroll Animation Hook
   ────────────────────────────────────── */
const useScrollAnimation = () => {
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
        );

        const elements = document.querySelectorAll('.animate-on-scroll');
        elements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, []);
};

/* ──────────────────────────────────────
   Animated Counter Hook
   ────────────────────────────────────── */
const useCounter = (end: number, duration: number = 2000) => {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const hasAnimated = useRef(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasAnimated.current) {
                    hasAnimated.current = true;
                    const startTime = performance.now();
                    const animate = (currentTime: number) => {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        const eased = 1 - Math.pow(1 - progress, 3);
                        setCount(Math.floor(eased * end));
                        if (progress < 1) requestAnimationFrame(animate);
                    };
                    requestAnimationFrame(animate);
                }
            },
            { threshold: 0.3 }
        );

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [end, duration]);

    return { count, ref };
};

/* ══════════════════════════════════════
   LANDING PAGE
   ══════════════════════════════════════ */
interface LandingStatisticProps {
    end: number;
    suffix: string;
    label: string;
    icon: LucideIcon;
}

function LandingStatistic({ end, suffix, label, icon: Icon }: LandingStatisticProps) {
    const { count, ref } = useCounter(end);
    return (
        <div ref={ref} className="text-center animate-on-scroll">
            <Icon className="w-8 h-8 text-blue-400 mx-auto mb-4" />
            <p className="text-4xl sm:text-5xl font-extrabold text-white mb-2">
                {count}{suffix}
            </p>
            <p className="text-sm text-gray-500 font-medium">{label}</p>
        </div>
    );
}

export const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    useScrollAnimation();

    const navLinks = [
        { label: 'Features', href: '#features' },
        { label: 'Modules', href: '#modules' },
        { label: 'Stats', href: '#stats' },
        { label: 'Contact', href: '#contact' },
    ];

    return (
        <div className="min-h-screen bg-[#0a0e27] text-white overflow-x-hidden">

            {/* ═══════════════════════════════
          1. NAVBAR
          ═══════════════════════════════ */}
            <nav className="fixed top-0 left-0 right-0 z-50 navbar-blur bg-[#0a0e27]/80 border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Plane className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-lg font-bold tracking-tight">Travneeds</span>
                        </div>

                        {/* Desktop links */}
                        <div className="hidden md:flex items-center space-x-8">
                            {navLinks.map((link) => (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </div>

                        {/* CTA */}
                        <div className="hidden md:flex items-center space-x-3">
                            <button
                                onClick={() => navigate('/login')}
                                className="text-sm text-gray-300 hover:text-white px-4 py-2 transition-colors"
                            >
                                Login
                            </button>
                            <button
                                onClick={() => navigate('/login')}
                                className="text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30"
                            >
                                Get Started
                            </button>
                        </div>

                        {/* Mobile menu toggle */}
                        <button
                            className="md:hidden p-2 text-gray-400 hover:text-white"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>

                    {/* Mobile menu */}
                    {mobileMenuOpen && (
                        <div className="md:hidden pb-4 border-t border-white/5 mt-2 pt-4 space-y-3">
                            {navLinks.map((link) => (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    className="block text-sm text-gray-400 hover:text-white py-2"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {link.label}
                                </a>
                            ))}
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full text-sm font-medium bg-blue-600 text-white px-5 py-2.5 rounded-xl mt-2"
                            >
                                Get Started
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            {/* ═══════════════════════════════
          2. HERO SECTION
          ═══════════════════════════════ */}
            <section className="hero-gradient grid-lines relative pt-32 pb-20 lg:pt-40 lg:pb-32">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

                        {/* Left – Copy */}
                        <div>
                            <div className="inline-flex items-center space-x-2 bg-blue-600/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
                                <Zap className="w-4 h-4 text-blue-400" />
                                <span className="text-xs font-medium text-blue-300">All-in-One Travel CRM</span>
                            </div>

                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6">
                                Save Time & Money{' '}
                                <span className="text-gradient-shimmer">On Every Trip</span>
                            </h1>

                            <p className="text-lg text-gray-400 leading-relaxed max-w-lg mb-8">
                                Manage leads, track sales, handle reservations, and streamline every part of your travel &amp; tourism business — all from a single, powerful platform.
                            </p>

                            <div className="flex flex-wrap gap-4">
                                <button
                                    onClick={() => navigate('/login')}
                                    className="group inline-flex items-center px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-2xl transition-all duration-300 shadow-xl shadow-blue-600/25 hover:shadow-blue-500/35 hover:scale-[1.02]"
                                >
                                    Start Free Trial
                                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                                <a
                                    href="#features"
                                    className="inline-flex items-center px-7 py-3.5 border border-white/10 hover:border-white/25 text-gray-300 hover:text-white font-medium rounded-2xl transition-all duration-300 hover:bg-white/5"
                                >
                                    Explore Features
                                </a>
                            </div>

                            {/* Mini social proof */}
                            <div className="flex items-center space-x-4 mt-10">
                                <div className="flex -space-x-2">
                                    {['SA', 'AH', 'MK', 'NR'].map((initials, i) => (
                                        <div
                                            key={i}
                                            className="w-9 h-9 rounded-full border-2 border-[#0a0e27] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold"
                                        >
                                            {initials}
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <div className="flex items-center space-x-1 text-yellow-400">
                                        {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">Trusted by 500+ travel agencies</p>
                                </div>
                            </div>
                        </div>

                        {/* Right – Floating Cards */}
                        <div className="relative hidden lg:block">
                            {/* Main dashboard card */}
                            <div className="animate-float-slow glass-card rounded-3xl p-6 w-[420px] ml-auto">
                                <div className="flex items-center justify-between mb-5">
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1">Monthly Revenue</p>
                                        <p className="text-3xl font-bold">$128,400</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-green-500/15 flex items-center justify-center">
                                        <TrendingUp className="w-6 h-6 text-green-400" />
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 text-sm">
                                    <span className="text-green-400 font-semibold">+23.5%</span>
                                    <span className="text-gray-500">vs last month</span>
                                </div>
                                {/* Mini chart bars */}
                                <div className="flex items-end space-x-2 mt-5 h-16">
                                    {[40, 55, 45, 70, 60, 80, 65, 90, 75, 95, 85, 100].map((h, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 rounded-t-sm bg-gradient-to-t from-blue-600/40 to-blue-400/60"
                                            style={{ height: `${h}%` }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Floating stat card – top left */}
                            <div className="absolute -top-4 -left-8 animate-float glass-card rounded-2xl px-5 py-4 animate-pulse-glow">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Active Leads</p>
                                        <p className="text-xl font-bold">1,847</p>
                                    </div>
                                </div>
                            </div>

                            {/* Floating stat card – bottom left */}
                            <div className="absolute bottom-8 -left-14 animate-float-delay glass-card rounded-2xl px-5 py-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Bookings Today</p>
                                        <p className="text-xl font-bold">47</p>
                                    </div>
                                </div>
                            </div>

                            {/* Decorative orbit dot */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                <div className="animate-orbit">
                                    <div className="w-2 h-2 rounded-full bg-blue-400/50" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════
          3. TRUSTED BY
          ═══════════════════════════════ */}
            <section className="bg-[#0c1030] border-y border-white/5 py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <p className="text-center text-xs font-medium text-gray-500 uppercase tracking-widest mb-8">
                        Trusted by leading travel agencies worldwide
                    </p>
                    <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6">
                        {['Nile Cruises Co.', 'Cairo Tours Ltd', 'Pharaoh Travel', 'Desert Safari Pro', 'Red Sea Adventures', 'Luxor Expeditions'].map((name) => (
                            <div key={name} className="flex items-center space-x-2 text-gray-500/60 hover:text-gray-400 transition-colors">
                                <Globe className="w-5 h-5" />
                                <span className="text-sm font-semibold tracking-wide">{name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════
          4. FEATURES GRID
          ═══════════════════════════════ */}
            <section id="features" className="py-24 lg:py-32 bg-[#0a0e27]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-16 animate-on-scroll">
                        <div className="inline-flex items-center space-x-2 bg-blue-600/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-4">
                            <PieChart className="w-4 h-4 text-blue-400" />
                            <span className="text-xs font-medium text-blue-300">Powerful Features</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                            Everything You Need to{' '}
                            <span className="text-blue-400">Grow Your Business</span>
                        </h2>
                        <p className="text-gray-400 text-lg">
                            From lead capture to financial reporting, Travneeds covers every aspect of your travel business operations.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                icon: Users,
                                title: 'Lead Management',
                                desc: 'Capture, track, and convert leads with an intelligent pipeline. Never miss a potential customer again.',
                                color: 'blue'
                            },
                            {
                                icon: TrendingUp,
                                title: 'Sales Pipeline',
                                desc: 'Visualize your entire sales process. Track deals, proposals, and close rates with precision.',
                                color: 'green'
                            },
                            {
                                icon: Calendar,
                                title: 'Smart Reservations',
                                desc: 'Handle bookings for hotels, flights, tours, and activities with real-time availability tracking.',
                                color: 'purple'
                            },
                            {
                                icon: Wallet,
                                title: 'Financial Management',
                                desc: 'Complete financial oversight with invoicing, payments, revenue tracking, and expense management.',
                                color: 'amber'
                            },
                            {
                                icon: Headphones,
                                title: 'Customer Support',
                                desc: 'Built-in ticketing system to handle customer inquiries with priority-based routing and SLAs.',
                                color: 'rose'
                            },
                            {
                                icon: BarChart3,
                                title: 'Advanced Reports',
                                desc: 'Data-driven insights with customizable dashboards, charts, and exportable business intelligence.',
                                color: 'cyan'
                            },
                        ].map((feature, idx) => {
                            const colorMap: Record<string, string> = {
                                blue: 'from-blue-500/15 to-blue-600/5 text-blue-400 group-hover:shadow-blue-500/10',
                                green: 'from-green-500/15 to-green-600/5 text-green-400 group-hover:shadow-green-500/10',
                                purple: 'from-purple-500/15 to-purple-600/5 text-purple-400 group-hover:shadow-purple-500/10',
                                amber: 'from-amber-500/15 to-amber-600/5 text-amber-400 group-hover:shadow-amber-500/10',
                                rose: 'from-rose-500/15 to-rose-600/5 text-rose-400 group-hover:shadow-rose-500/10',
                                cyan: 'from-cyan-500/15 to-cyan-600/5 text-cyan-400 group-hover:shadow-cyan-500/10',
                            };
                            const colors = colorMap[feature.color] || colorMap.blue;

                            return (
                                <div
                                    key={feature.title}
                                    className={`animate-on-scroll stagger-${idx + 1} group feature-card bg-white/[0.03] border border-white/[0.06] rounded-2xl p-7 hover:bg-white/[0.06] cursor-default`}
                                >
                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colors} flex items-center justify-center mb-5`}>
                                        <feature.icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                                    <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════
          5. APP SHOWCASE
          ═══════════════════════════════ */}
            <section className="py-24 lg:py-32 bg-[#0c1030] relative overflow-hidden">
                <div className="absolute inset-0 grid-lines pointer-events-none opacity-40" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-2xl mx-auto mb-16 animate-on-scroll">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                            A Dashboard That{' '}
                            <span className="text-blue-400">Works For You</span>
                        </h2>
                        <p className="text-gray-400 text-lg">
                            Get a bird's-eye view of your entire operation. Real-time metrics, actionable insights, zero guesswork.
                        </p>
                    </div>

                    {/* Dashboard mockup */}
                    <div className="animate-on-scroll relative max-w-5xl mx-auto">
                        <div className="glass-card rounded-3xl p-2 sm:p-3 animate-pulse-glow">
                            <div className="bg-[#0f1340] rounded-2xl p-6 sm:p-8">
                                {/* Mock header */}
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-xl font-bold">Dashboard</h3>
                                        <p className="text-sm text-gray-500">Welcome back! Here's what's happening today.</p>
                                    </div>
                                    <div className="hidden sm:flex items-center space-x-2">
                                        <div className="px-4 py-2 bg-blue-600/15 text-blue-400 text-xs font-medium rounded-lg">This Month</div>
                                        <div className="px-4 py-2 bg-white/5 text-gray-400 text-xs rounded-lg">This Year</div>
                                    </div>
                                </div>

                                {/* Stats row */}
                                <div className="grid sm:grid-cols-4 gap-4 mb-8">
                                    {[
                                        { label: 'New Leads', value: '128', change: '+12%', icon: Users },
                                        { label: 'Bookings', value: '847', change: '+8%', icon: Calendar },
                                        { label: 'Revenue', value: '$94.2K', change: '+23%', icon: TrendingUp },
                                        { label: 'Satisfaction', value: '96%', change: '+2%', icon: Star },
                                    ].map((stat) => (
                                        <div key={stat.label} className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06]">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs text-gray-500">{stat.label}</p>
                                                <stat.icon className="w-4 h-4 text-gray-600" />
                                            </div>
                                            <p className="text-2xl font-bold">{stat.value}</p>
                                            <span className="text-xs text-green-400 font-medium">{stat.change}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Chart area placeholder */}
                                <div className="bg-white/[0.02] rounded-xl p-6 border border-white/[0.04]">
                                    <p className="text-sm font-semibold mb-4 text-gray-300">Revenue & Bookings Trend</p>
                                    <div className="flex items-end space-x-3 h-32">
                                        {[35, 50, 42, 68, 55, 80, 62, 90, 78, 95, 82, 100].map((h, i) => (
                                            <div key={i} className="flex-1 flex flex-col items-stretch gap-1">
                                                <div
                                                    className="rounded-t bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-500"
                                                    style={{ height: `${h}%` }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between mt-3 text-xs text-gray-600">
                                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                                            <span key={m}>{m}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating annotations */}
                        <div className="absolute -right-6 top-16 animate-float glass-card rounded-2xl px-4 py-3 hidden lg:block">
                            <div className="flex items-center space-x-2 text-sm">
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                                <span className="text-gray-300 font-medium">Live Analytics</span>
                            </div>
                        </div>
                        <div className="absolute -left-6 bottom-20 animate-float-delay glass-card rounded-2xl px-4 py-3 hidden lg:block">
                            <div className="flex items-center space-x-2 text-sm">
                                <Shield className="w-5 h-5 text-blue-400" />
                                <span className="text-gray-300 font-medium">Bank-Grade Security</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════
          6. STATISTICS
          ═══════════════════════════════ */}
            <section id="stats" className="py-20 bg-[#0a0e27]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { end: 500, suffix: '+', label: 'Travel Agencies', icon: Globe },
                            { end: 150, suffix: 'K+', label: 'Bookings Managed', icon: Calendar },
                            { end: 98, suffix: '%', label: 'Client Satisfaction', icon: Star },
                            { end: 24, suffix: '/7', label: 'System Uptime', icon: Shield },
                        ].map(stat => <LandingStatistic key={stat.label} {...stat} />)}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════
          7. MODULES BREAKDOWN
          ═══════════════════════════════ */}
            <section id="modules" className="py-24 lg:py-32 bg-[#0c1030]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-16 animate-on-scroll">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                            Complete System{' '}
                            <span className="text-blue-400">Modules</span>
                        </h2>
                        <p className="text-gray-400 text-lg">
                            12 integrated modules designed specifically for travel and tourism businesses.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                        {[
                            { icon: BarChart3, title: 'Dashboard & Analytics', desc: 'Real-time KPIs, revenue charts, lead funnels, and booking trends all in one glance.' },
                            { icon: Users, title: 'Lead Management', desc: 'Capture leads from multiple sources, auto-assign agents, track pipeline stages.' },
                            { icon: UserCheck, title: 'Customer Database', desc: 'Complete customer profiles, booking history, corporate accounts, and preferences.' },
                            { icon: MapPin, title: 'Product Categories', desc: 'Organize hotels, flights, tours, activities, and packages with detailed pricing.' },
                            { icon: CreditCard, title: 'Sales & Invoicing', desc: 'Quote generation, deal tracking, invoice creation, and payment collection.' },
                            { icon: Calendar, title: 'Reservations', desc: 'Smart booking engine with availability search, itinerary builder, and confirmations.' },
                            { icon: Wallet, title: 'Finance & Accounting', desc: 'Revenue tracking, expense management, profit analysis, and tax reporting.' },
                            { icon: Settings, title: 'Operations', desc: 'Supplier management, transport coordination, and operational workflow automation.' },
                            { icon: FileText, title: 'Reports', desc: 'Customizable reports with export options, scheduled delivery, and trend analysis.' },
                            { icon: Headphones, title: 'Support Tickets', desc: 'Customer support ticketing with SLA tracking, priority routing, and resolution metrics.' },
                            { icon: Shield, title: 'User Management', desc: 'Role-based access control, team management, permissions, and audit logging.' },
                            { icon: TrendingUp, title: 'Attendance', desc: 'Employee attendance tracking, shift management, and overtime calculations.' },
                        ].map((mod, idx) => (
                            <div
                                key={mod.title}
                                className={`animate-on-scroll stagger-${(idx % 6) + 1} group flex items-start space-x-4 p-5 bg-white/[0.03] border border-white/[0.06] rounded-2xl hover:bg-white/[0.06] hover:border-blue-500/20 transition-all duration-300`}
                            >
                                <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                                    <mod.icon className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold mb-1 group-hover:text-blue-300 transition-colors">{mod.title}</h3>
                                    <p className="text-xs text-gray-500 leading-relaxed">{mod.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════
          8. CTA SECTION
          ═══════════════════════════════ */}
            <section id="contact" className="py-24 lg:py-32 bg-[#0a0e27]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="animate-on-scroll cta-gradient rounded-3xl p-10 sm:p-16 text-center relative overflow-hidden">
                        {/* Decorative */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />

                        <div className="relative z-10">
                            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                                Ready to Transform Your Travel Business?
                            </h2>
                            <p className="text-gray-300 text-lg max-w-xl mx-auto mb-8">
                                Join hundreds of travel agencies already using Travneeds to streamline their operations and boost revenue.
                            </p>
                            <div className="flex flex-wrap justify-center gap-4">
                                <button
                                    onClick={() => navigate('/login')}
                                    className="group inline-flex items-center px-8 py-4 bg-white text-[#0f1340] font-bold rounded-2xl transition-all duration-300 hover:bg-gray-100 hover:scale-[1.02] shadow-xl"
                                >
                                    Start For Free
                                    <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                                <button className="inline-flex items-center px-8 py-4 border border-white/20 text-white font-medium rounded-2xl hover:bg-white/5 transition-all duration-300">
                                    Schedule Demo
                                </button>
                            </div>

                            <div className="flex flex-wrap justify-center items-center gap-6 mt-10 text-sm text-gray-400">
                                <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" /> No credit card required</span>
                                <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" /> 14-day free trial</span>
                                <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" /> Cancel anytime</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════
          9. FOOTER
          ═══════════════════════════════ */}
            <footer className="bg-[#080b20] border-t border-white/5 pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
                        {/* Brand */}
                        <div>
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                                    <Plane className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-lg font-bold">Travneeds</span>
                            </div>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                Integrated Management System for Travel & Tourism. Streamline your operations from a single platform.
                            </p>
                        </div>

                        {/* Product */}
                        <div>
                            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Product</h4>
                            <ul className="space-y-3">
                                {['Features', 'Modules', 'Pricing', 'Updates', 'Documentation'].map((item) => (
                                    <li key={item}>
                                        <a href="#" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">{item}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Company */}
                        <div>
                            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Company</h4>
                            <ul className="space-y-3">
                                {['About Us', 'Careers', 'Blog', 'Partners', 'Contact'].map((item) => (
                                    <li key={item}>
                                        <a href="#" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">{item}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Legal */}
                        <div>
                            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Legal</h4>
                            <ul className="space-y-3">
                                {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR'].map((item) => (
                                    <li key={item}>
                                        <a href="#" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">{item}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Bottom */}
                    <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-xs text-gray-600">
                            © 2026 Travneeds System. All rights reserved.
                        </p>
                        <p className="text-xs text-gray-600">
                            Powered by{' '}
                            <a
                                href="https://dipencil.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-gray-500 hover:text-blue-400 transition-colors"
                            >
                                diPencil Studio
                            </a>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};
