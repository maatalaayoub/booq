'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import { MapPin, Star, Navigation, Phone, Scissors, CalendarCheck, MessageCircle, ExternalLink } from 'lucide-react';
import Image from 'next/image';

const mapStyles = `
  .custom-popup .leaflet-popup-content-wrapper {
    padding: 0;
    overflow: hidden;
    border-radius: 12px;
  }
  .custom-popup .leaflet-popup-content {
    margin: 0;
    width: 280px !important;
  }
  .custom-popup .leaflet-popup-tip-container {
    display: none;
  }
  .custom-popup .leaflet-popup-content a {
    color: inherit !important;
    text-decoration: none !important;
  }
  .custom-popup .leaflet-popup-content a.text-white {
    color: #fff !important;
  }
`;

function createCustomIcon() {
  if (typeof document === 'undefined' || !L?.divIcon) return null;
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: #244C70;
      width: 36px;
      height: 36px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid #FFFFFF;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      transition: transform 0.2s;
    ">
      <div style="
        width: 14px;
        height: 14px;
        background-color: #FFFFFF;
        border-radius: 50%;
        transform: rotate(45deg);
      "></div>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

function createHighlightedIcon() {
  if (typeof document === 'undefined' || !L?.divIcon) return null;
  return L.divIcon({
    className: 'custom-marker highlighted',
    html: `<div style="
      background-color: #e85d04;
      width: 44px;
      height: 44px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid #FFFFFF;
      box-shadow: 0 4px 12px rgba(232,93,4,0.5);
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      transition: all 0.3s;
    ">
      <div style="
        width: 16px;
        height: 16px;
        background-color: #FFFFFF;
        border-radius: 50%;
        transform: rotate(45deg);
      "></div>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -44],
  });
}

// Calculate bounds to show all markers
function BoundsFitter({ businesses }) {
  const map = useMap();
  
  useEffect(() => {
    const validBusinesses = businesses?.filter(b => b && b.latitude && b.longitude) || [];
    if (validBusinesses.length > 0) {
      const bounds = L.latLngBounds(validBusinesses.map(b => [b.latitude, b.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [businesses, map]);

  return null;
}

// Smoothly fly to hovered business
function FlyToHovered({ businesses, hoveredBusinessId }) {
  const map = useMap();
  
  useEffect(() => {
    if (!hoveredBusinessId) return;
    const biz = businesses?.find(b => b.id === hoveredBusinessId);
    if (biz?.latitude && biz?.longitude) {
      map.flyTo([biz.latitude, biz.longitude], 15, { duration: 0.8 });
    }
  }, [hoveredBusinessId, businesses, map]);

  return null;
}

// Fly to selected business and open its popup (mobile tap)
function FlyToSelected({ businesses, selectedBusinessId, markerRefs }) {
  const map = useMap();
  
  useEffect(() => {
    if (!selectedBusinessId) return;
    const biz = businesses?.find(b => b.id === selectedBusinessId);
    if (biz?.latitude && biz?.longitude) {
      map.flyTo([biz.latitude, biz.longitude], 16, { duration: 0.8 });
      // Open the popup after flyTo completes
      setTimeout(() => {
        const marker = markerRefs.current?.[selectedBusinessId];
        if (marker) marker.openPopup();
      }, 900);
    }
  }, [selectedBusinessId, businesses, map, markerRefs]);

  return null;
}

export default function PlacesMap({ businesses, locale, hoveredBusinessId, selectedBusinessId, onPopupClose }) {
  const [ready, setReady] = useState(false);
  const markerRefs = useRef({});

  useEffect(() => {
    setReady(true);
    // Fix missing icons in nextjs
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  // Memoize icon to avoid recreating on every render
  const customIcon = useMemo(() => {
    if (!ready) return null;
    return createCustomIcon();
  }, [ready]);

  const highlightedIcon = useMemo(() => {
    if (!ready) return null;
    return createHighlightedIcon();
  }, [ready]);

  if (!ready || !customIcon) return null;

  // Default to Casablanca
  const defaultCenter = [33.5731, -7.5898];

  return (
    <>
      <style>{mapStyles}</style>
      <MapContainer
        center={defaultCenter}
        zoom={12}
        zoomControl={false}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">Carto</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      
      <BoundsFitter businesses={businesses} />
      <FlyToHovered businesses={businesses} hoveredBusinessId={hoveredBusinessId} />
      <FlyToSelected businesses={businesses} selectedBusinessId={selectedBusinessId} markerRefs={markerRefs} />

      <MarkerClusterGroup
        chunkedLoading
        showCoverageOnHover={false}
        maxClusterRadius={50}
        iconCreateFunction={(cluster) => {
          return L.divIcon({
            html: `<div style="
              background-color: #244C70;
              color: white;
              width: 36px;
              height: 36px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              border: 3px solid white;
              box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            ">${cluster.getChildCount()}</div>`,
            className: 'custom-cluster-icon',
            iconSize: L.point(36, 36, true),
          });
        }}
      >
        {businesses?.filter(b => b && b.latitude && b.longitude).map((biz) => (
          <Marker 
            key={biz.id} 
            position={[biz.latitude, biz.longitude]}
            icon={biz.id === hoveredBusinessId || biz.id === selectedBusinessId ? highlightedIcon || customIcon : customIcon}
            ref={(ref) => { if (ref) markerRefs.current[biz.id] = ref; }}
            eventHandlers={{
              popupclose: () => { if (onPopupClose) onPopupClose(); },
            }}
          >
            <Popup className="custom-popup" closeButton={false} minWidth={280}>
              <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-lg border border-gray-100 p-0 m-0">
                {/* Image gallery */}
                {biz.coverGallery && biz.coverGallery.length > 0 ? (
                  <div className="relative h-32 w-full bg-gray-200 overflow-hidden">
                    <div className="flex h-full w-full">
                      {biz.coverGallery.slice(0, 3).map((img, i) => (
                        <div key={i} className={`relative h-full ${biz.coverGallery.length === 1 ? 'w-full' : biz.coverGallery.length === 2 ? 'w-1/2' : 'w-1/3'}`}>
                          <Image 
                            src={img} 
                            alt={biz.businessName}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                    {/* Rating badge */}
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full text-xs font-bold text-gray-800 flex items-center gap-1 shadow-sm">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      4.9
                    </div>
                  </div>
                ) : (
                  <div className="h-24 w-full bg-gradient-to-r from-[#244C70] to-[#4a7aa8] flex items-center justify-center">
                    <Scissors className="w-8 h-8 text-white/40" />
                  </div>
                )}
                
                <div className="p-3">
                  <h3 className="font-bold text-gray-900 text-base mb-0.5 truncate">{biz.businessName}</h3>
                  <div className="flex items-center text-gray-500 text-xs mb-2 gap-1">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{biz.city || 'Location'}</span>
                  </div>

                  {/* Services preview */}
                  {biz.services && biz.services.length > 0 && (
                    <div className="space-y-1 mb-3 py-2 border-t border-gray-100">
                      {biz.services.slice(0, 2).map((s, i) => (
                        <div key={i} className="flex justify-between items-center text-xs">
                          <span className="text-gray-600 truncate pr-2">{s.name}</span>
                          <span className="font-semibold text-gray-900 whitespace-nowrap">{s.price} {s.currency}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Action buttons based on config */}
                  <div className="flex gap-2">
                    {biz.showBookingButton ? (
                      <Link
                        href={`/${locale}/b/${biz.id}`}
                        className="flex-1 bg-[#244C70] text-white text-center py-2 rounded-lg text-sm font-medium hover:bg-[#1a3a5a] transition-colors flex items-center justify-center gap-1.5"
                      >
                        <CalendarCheck className="w-3.5 h-3.5" />
                        Book Now
                      </Link>
                    ) : biz.showGetDirections ? (
                      <>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${biz.latitude},${biz.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-[#244C70] text-white text-center py-2 rounded-lg text-sm font-medium hover:bg-[#1a3a5a] transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          Directions
                        </a>
                        <Link
                          href={`/${locale}/b/${biz.id}`}
                          className="flex-1 bg-gray-100 text-gray-700 text-center py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Details
                        </Link>
                      </>
                    ) : (biz.showCallButton || biz.showMessageButton) ? (
                      <>
                        {biz.phone ? (
                          <a
                            href={`tel:${biz.phone}`}
                            className="flex-1 bg-[#244C70] text-white text-center py-2 rounded-lg text-sm font-medium hover:bg-[#1a3a5a] transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Contact
                          </a>
                        ) : (
                          <Link
                            href={`/${locale}/b/${biz.id}`}
                            className="flex-1 bg-[#244C70] text-white text-center py-2 rounded-lg text-sm font-medium hover:bg-[#1a3a5a] transition-colors flex items-center justify-center gap-1.5"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            Contact
                          </Link>
                        )}
                        <Link
                          href={`/${locale}/b/${biz.id}`}
                          className="flex-1 bg-gray-100 text-gray-700 text-center py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Details
                        </Link>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
    </>
  );
}