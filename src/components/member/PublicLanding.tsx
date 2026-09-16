import React, { useState } from 'react';
import { 
  Dumbbell, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  Flame, 
  Users, 
  Award, 
  ChevronRight,
  ChevronDown,
  MessageCircle
} from 'lucide-react';
import { GymSettings, MembershipPlan, UserProfile } from '../../types';
import { GoogleMapsLocation } from '../common/GoogleMapsLocation';

interface PublicLandingProps {
  settings: GymSettings;
  plans: MembershipPlan[];
  trainers: UserProfile[];
  onJoinClick: (plan?: MembershipPlan) => void;
  onLoginClick: () => void;
  onStaffLoginClick?: () => void;
}

export const PublicLanding: React.FC<PublicLandingProps> = ({
  settings,
  plans,
  trainers,
  onJoinClick,
  onLoginClick,
  onStaffLoginClick
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does the "Personalized Fitness Without the Crowd" system work?',
      a: 'Infinity uses an intelligent gym-floor balancing engine. Every member is assigned an optimized workout and designated zone based on their personalized periodization program and real-time floor occupancy, eliminating wait times for benches and racks.'
    },
    {
      q: 'Can I choose my own workout or does the system decide?',
      a: 'Your workout is customized according to your fitness goals, program split, and recovery status. Furthermore, certified floor trainers have real-time clinical override authority to modify sets, reps, or exercises for any reported soreness or restrictions.'
    },
    {
      q: 'How do I check in when I arrive at the club?',
      a: 'Every active member receives an encrypted, contactless digital pass on their phone with a secure QR token. Simply tap or scan at the reception optical reader to instantly check in and view your assigned zone.'
    },
    {
      q: 'Are personal training and form assessments included?',
      a: 'Yes. All Quarterly, Half-Yearly, and Annual plans include assigned certified trainers, biometric body composition analysis, and tailored injury/mobility screening protocols.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100">
      {/* Announcement Bar */}
      {settings.announcement && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 py-2 px-4 text-center text-xs font-medium text-emerald-400 flex items-center justify-center gap-2">
          <Flame className="w-3.5 h-3.5 animate-pulse" />
          <span>{settings.announcement}</span>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="relative text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-6 shadow-md">
            <Sparkles className="w-3.5 h-3.5" />
            {settings.supportingConcept}
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white uppercase leading-[1.05]">
            {settings.name}
          </h1>
          <p className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-wider text-emerald-400 uppercase">
            {settings.tagline}
          </p>

          <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Personalized training. Smarter workouts. Stronger results. Train in high-performance,
            crowd-balanced zones designed for serious physical transformation without waiting for equipment.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onJoinClick()}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm tracking-wider uppercase transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              Join Now
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#plans"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-white font-bold text-sm tracking-wider uppercase transition flex items-center justify-center"
            >
              Explore Membership
            </a>
          </div>

          {/* Quick Metrics */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto border-t border-zinc-900 pt-8">
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
              <div className="text-2xl font-black text-white font-mono">6</div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mt-1">Smart Zones</div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
              <div className="text-2xl font-black text-emerald-400 font-mono">0 MIN</div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mt-1">Rack Wait Time</div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
              <div className="text-2xl font-black text-white font-mono">100%</div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mt-1">Trainer Guided</div>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
              <div className="text-2xl font-black text-emerald-400 font-mono">1-TAP</div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider mt-1">QR Check-In</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Infinity Section */}
      <section className="py-20 bg-[#0d0d10] border-y border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">The Infinity Difference</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight mt-2">
              Why Infinity Fitness Club
            </h2>
            <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
              Traditional gyms pack 50 people into the same dumbbell rack at 6 PM. Infinity utilizes real-time floor balancing to deliver athletic performance.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-6 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wide">Smart Crowd Distribution</h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  Our floor management dynamically tracks capacity across Chest, Back, Legs, Delts, Arms, and Conditioning bays, guaranteeing seamless equipment availability.
                </p>
              </div>
              <div className="mt-6 text-xs text-emerald-400 font-semibold flex items-center gap-1">
                Zero rack bottlenecks <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-6 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                  <Dumbbell className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wide">Biomechanical Programming</h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  Every member follows a calculated resistance split adjusted for recovery and injury restrictions, monitored in real time by certified staff.
                </p>
              </div>
              <div className="mt-6 text-xs text-emerald-400 font-semibold flex items-center gap-1">
                Scientifically periodized <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-6 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wide">Trainer Authority & Safety</h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                  Floor trainers have instant access to your restriction logs and can execute clinical exercise overrides on the spot for joint safety.
                </p>
              </div>
              <div className="mt-6 text-xs text-emerald-400 font-semibold flex items-center gap-1">
                Safety first, always <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Facilities Section */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Engineered For Athletes</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight mt-2">
            World-Class Facilities
          </h2>
          <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
            Equipped with top-tier biomechanical resistance stations, Olympic platforms, and luxury amenities.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {settings.facilities.map((fac, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-sm font-medium text-zinc-200">{fac}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Membership Plans */}
      <section id="plans" className="py-20 bg-[#0d0d10] border-y border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Membership Tiers</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight mt-2">
              Select Your Commitment
            </h2>
            <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
              Transparent pricing with no hidden enrollment fees. Full access to our smart crowd-balanced training floor.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 flex flex-col justify-between border transition duration-200 ${
                  plan.highlight
                    ? 'bg-zinc-900 border-emerald-500 shadow-xl shadow-emerald-500/10'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {plan.discount && (
                  <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-emerald-500 text-black text-[11px] font-extrabold uppercase tracking-wider">
                    {plan.discount}
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wide">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-sm text-zinc-400 font-bold">{settings.currency}</span>
                    <span className="text-3xl sm:text-4xl font-black text-white font-mono">
                      {plan.price.toLocaleString()}
                    </span>
                    <span className="text-xs text-zinc-500">/{plan.durationMonths} mo</span>
                  </div>

                  <div className="mt-6 space-y-2.5 border-t border-zinc-800 pt-6">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    onClick={() => onJoinClick(plan)}
                    className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
                      plan.highlight
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    }`}
                  >
                    Select Plan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trainers Section */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Coaching Staff</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight mt-2">
            Certified Floor Coaches
          </h2>
          <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
            Our floor trainers are physically present to analyze form, prevent injury, and optimize training intensity.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {trainers.map((trainer) => (
            <div key={trainer.id} className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6 flex flex-col items-center text-center">
              <img
                src={trainer.avatarUrl || 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&auto=format&fit=crop&q=80'}
                alt={trainer.fullName}
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-full object-cover border-2 border-emerald-500/40 p-1 mb-4 shadow-lg"
              />
              <h3 className="text-lg font-bold text-white">{trainer.fullName}</h3>
              <div className="text-xs text-emerald-400 font-semibold mt-1">{trainer.fitnessGoal}</div>
              <p className="text-xs text-zinc-400 mt-3 leading-relaxed">{trainer.trainerNotes}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Club Location & Google Maps Showcase */}
      <section id="location" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-zinc-900">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-3">
            <MapPin className="w-3.5 h-3.5" />
            Training Facility & Coordinates
          </div>
          <h2 className="text-3xl sm:text-4xl font-black uppercase text-white tracking-tight">
            Find Us in Neelambur, Coimbatore
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2">
            Located right on Avinashi Road above Union Bank of India. Step into an air-purified, biomechanically equipped strength facility designed for focused athletes.
          </p>
        </div>

        <GoogleMapsLocation settings={settings} />
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-[#0d0d10] border-t border-zinc-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Got Questions?</span>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight mt-2">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="rounded-xl bg-zinc-900/70 border border-zinc-800 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4"
                >
                  <span className="font-bold text-sm text-white">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 transition-transform ${openFaq === idx ? 'rotate-180 text-emerald-400' : ''}`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-4 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location & Timings Footer */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-zinc-900">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-black text-lg text-white uppercase tracking-wider">{settings.name}</h3>
            <p className="text-xs text-emerald-400 font-semibold uppercase mt-1">{settings.tagline}</p>
            <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
              Designed for dedicated lifters, athletes, and fitness enthusiasts seeking uninterrupted, personalized training.
            </p>
          </div>

          <div className="space-y-2 text-xs text-zinc-400">
            <div className="font-bold uppercase tracking-wider text-white text-xs mb-2">Club Timings</div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{settings.openingHours}</span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-zinc-400">
            <div className="font-bold uppercase tracking-wider text-white text-xs mb-2">Location & Contact</div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span>{settings.address}</span>
                <div className="mt-1">
                  <a
                    href={settings.googleMapsUrl || 'https://maps.app.goo.gl/Xyt9iQEcfS67D6K5A'}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition"
                  >
                    <span>View on Google Maps</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex items-center gap-2">
                <a href={`tel:${settings.phone.replace(/\s+/g, '')}`} className="hover:text-emerald-400 transition">
                  {settings.phone}
                </a>
                {settings.altPhone && (
                  <>
                    <span className="text-zinc-600">/</span>
                    <a href={`tel:${settings.altPhone.replace(/\s+/g, '')}`} className="hover:text-emerald-400 transition">
                      {settings.altPhone}
                    </a>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <a
                href={`https://wa.me/91${(settings.whatsapp || settings.phone).replace(/\D/g, '').slice(-10)}?text=Hi%20Infinity%20Fitness%20Club,%20I%20would%20like%20to%20inquire%20about%20membership`}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                className="hover:text-emerald-400 transition"
              >
                WhatsApp: {settings.whatsapp || settings.phone}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
              <a href={`mailto:${settings.email}`} className="hover:text-emerald-400 transition">
                {settings.email}
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
          <div>© {new Date().getFullYear()} {settings.name}. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <button onClick={onLoginClick} className="hover:text-emerald-400 transition">
              Member Portal
            </button>
            {onStaffLoginClick && (
              <>
                <span>•</span>
                <button onClick={onStaffLoginClick} className="hover:text-emerald-400 transition">
                  Staff Entrance
                </button>
              </>
            )}
            <span>•</span>
            <a href="#plans" className="hover:text-emerald-400 transition">
              Memberships
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
