import React, { useState } from 'react';
import { 
  MapPin, 
  Navigation, 
  Phone, 
  Clock, 
  ExternalLink, 
  Star, 
  Check, 
  Copy, 
  Compass, 
  Car,
  ShieldCheck,
  MessageCircle
} from 'lucide-react';
import { GymSettings } from '../../types';

interface GoogleMapsLocationProps {
  settings: GymSettings;
  className?: string;
  variant?: 'full' | 'compact';
}

export const GoogleMapsLocation: React.FC<GoogleMapsLocationProps> = ({
  settings,
  className = '',
  variant = 'full'
}) => {
  const [copied, setCopied] = useState(false);

  const mapsUrl = settings.googleMapsUrl || 'https://maps.app.goo.gl/Xyt9iQEcfS67D6K5A';
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=11.0614441,77.0873855&destination_place_id=0x3ba857bf97204f8d:0xa0b8a2274bd21ba8`;
  const coordinatesStr = '11.0614441, 77.0873855';

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(`${settings.name}, ${settings.address}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const mapEmbedUrl = `https://maps.google.com/maps?q=11.0614441,77.0873855+(INFINITY+FITNESS+CLUB)&t=&z=17&ie=UTF8&iwloc=B&output=embed`;

  return (
    <div id="google-maps-location-card" className={`rounded-2xl bg-zinc-950 border border-zinc-800/80 overflow-hidden shadow-2xl ${className}`}>
      {/* Header Bar */}
      <div className="p-6 md:p-8 border-b border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-bold text-emerald-400 uppercase tracking-widest mb-2">
            <MapPin className="w-3.5 h-3.5" />
            Verified Google Maps Location
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            {settings.name}
            <span className="text-xs font-mono font-normal text-zinc-500 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
              Neelambur, Coimbatore
            </span>
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            {settings.landmark || 'Upstairs Union Bank of India, Avinashi Road, Neelambur, Coimbatore'}
          </p>
        </div>

        {/* Rating and Direct Link */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center gap-2">
            <div className="flex items-center text-amber-400">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-black text-white">{settings.googleRating || 4.9} <span className="text-xs text-zinc-400 font-normal">/ 5.0</span></div>
              <div className="text-[10px] text-zinc-400 font-medium">{settings.googleReviewCount || 18}+ Google Reviews</div>
            </div>
          </div>

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-emerald-500/10"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Open Maps</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-0">
        {/* Left Column: Details & Practical Info */}
        <div className="lg:col-span-5 p-6 md:p-8 space-y-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-zinc-800/80">
          {/* Address card */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-300">Club Address</div>
                  <p className="text-xs text-zinc-300 leading-relaxed mt-1 font-medium">
                    {settings.address}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCopyAddress}
                title="Copy full address"
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* GPS Coordinates pill */}
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <div className="flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>GPS: {coordinatesStr}</span>
              </div>
              <span className="text-[10px] text-zinc-400">Sulur / Neelambur</span>
            </div>
          </div>

          {/* Operating Hours Breakdown */}
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/70 space-y-2.5 text-xs">
            <div className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Training Hours (Daily)</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="p-2 rounded-lg bg-black/40 border border-zinc-800/60">
                <span className="text-emerald-400 font-bold block">Morning Batch</span>
                <span className="text-zinc-300 font-mono">5:30 AM – 10:00 AM</span>
              </div>
              <div className="p-2 rounded-lg bg-black/40 border border-zinc-800/60">
                <span className="text-emerald-400 font-bold block">Evening Batch</span>
                <span className="text-zinc-300 font-mono">5:00 PM – 9:30 PM</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60">
              <span>Sunday (Active Recovery / Open Floor):</span>
              <span className="font-mono text-zinc-300">6:00 AM – 10:00 AM</span>
            </div>
          </div>

          {/* Direct Actions: Call, WhatsApp & Directions */}
          <div className="grid sm:grid-cols-2 gap-2 pt-2">
            <a
              href={`tel:${settings.phone.replace(/\s+/g, '')}`}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>{settings.phone}</span>
            </a>

            <a
              href={`https://wa.me/91${(settings.whatsapp || settings.phone).replace(/\D/g, '').slice(-10)}?text=Hi%20Infinity%20Fitness%20Club,%20I%20would%20like%20to%20visit%20the%20gym%20in%20Neelambur`}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              className="px-3.5 py-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/50 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp Chat</span>
            </a>
          </div>

          {/* Proximity / Accessibility Landmarks */}
          <div className="p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/40 text-[11px] text-zinc-400 space-y-1">
            <div className="font-bold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
              <Car className="w-3.5 h-3.5 text-emerald-400" />
              Transit & Landmark Highlights
            </div>
            <p>• Above Union Bank of India, Avinashi Main Road</p>
            <p>• 8 mins from Coimbatore International Airport (CJB)</p>
            <p>• 6 mins from KMCH & Avinashi Road corridor</p>
          </div>
        </div>

        {/* Right Column: Google Maps Interactive Viewport */}
        <div className="lg:col-span-7 relative min-h-[380px] lg:min-h-[460px] bg-zinc-900 overflow-hidden">
          <iframe
            title="Google Maps - Infinity Fitness Club Neelambur"
            src={mapEmbedUrl}
            width="100%"
            height="100%"
            style={{ border: 0, minHeight: '380px' }}
            allowFullScreen={true}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-full grayscale-[15%] contrast-110 opacity-90 hover:opacity-100 transition duration-300"
          />

          {/* Floating Navigation Pill */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-zinc-700/80 text-xs shadow-xl">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-white font-bold">Infinity Fitness Club</span>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              className="ml-2 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] uppercase tracking-wider flex items-center gap-1"
            >
              Directions
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
