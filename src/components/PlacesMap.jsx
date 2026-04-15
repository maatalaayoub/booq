'use client';

import { useEffect, useState, useMemo, useRef, Component } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import { MapPin, Star, Navigation, Phone, Scissors, CalendarCheck, MessageCircle, ExternalLink } from 'lucide-react';
import Image from 'next/image';

// Error boundary to catch react-leaflet-cluster appendChild errors during HMR
class ClusterErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch() {}
  componentDidUpdate(_, prevState) {
    if (prevState.hasError) this.setState({ hasError: false });
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

const mapStyles = `
  .custom-popup .leaflet-popup-content-wrapper {
    padding: 0;
    overflow: hidden;
    border-radius: 16px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.12);
  }
  .custom-popup .leaflet-popup-content {
    margin: 0;
    width: 260px !important;
  }
  .custom-popup .leaflet-popup-tip-container {
    display: none;
  }
  .custom-popup .leaflet-popup-content a {
    color: inherit !important;
    text-decoration: none !important;
  }
  .custom-popup .leaflet-popup-content a.popup-cta {
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

// Returns true only when both coords are real finite numbers (guards against NaN / "NaN" strings)
const hasValidCoords = (b) =>
  b != null &&
  Number.isFinite(Number(b.latitude)) &&
  Number.isFinite(Number(b.longitude));

// Calculate bounds to show all markers
function BoundsFitter({ businesses }) {
  const map = useMap();
  
  useEffect(() => {
    const validBusinesses = businesses?.filter(hasValidCoords) || [];
    if (validBusinesses.length === 0) return;
    // Skip if map container has zero size (hidden via CSS)
    const size = map.getSize();
    if (!size || size.x === 0 || size.y === 0) return;
    try {
      const bounds = L.latLngBounds(validBusinesses.map(b => [Number(b.latitude), Number(b.longitude)]));
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    } catch (_) { /* skip invalid coords */ }
  }, [businesses, map]);

  return null;
}

// Invalidate map size when container becomes visible after being hidden
function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;

    const observer = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [map]);

  return null;
}

// Smoothly fly to hovered business
function FlyToHovered({ businesses, hoveredBusinessId }) {
  const map = useMap();
  
  useEffect(() => {
    if (!hoveredBusinessId) return;
    const biz = businesses?.find(b => b.id === hoveredBusinessId);
    if (!hasValidCoords(biz)) return;
    const size = map.getSize();
    if (!size || size.x === 0 || size.y === 0) return;
    const lat = Number(biz.latitude);
    const lng = Number(biz.longitude);
    try {
      map.flyTo([lat, lng], 15, { duration: 0.8 });
    } catch (_) { /* skip invalid coords */ }
  }, [hoveredBusinessId, businesses, map]);

  return null;
}

// Fly to selected business and open its popup (mobile tap)
function FlyToSelected({ businesses, selectedBusinessId, markerRefs }) {
  const map = useMap();
  
  useEffect(() => {
    if (!selectedBusinessId) return;
    const biz = businesses?.find(b => b.id === selectedBusinessId);
    if (!hasValidCoords(biz)) return;
    const size = map.getSize();
    if (!size || size.x === 0 || size.y === 0) return;
    const lat = Number(biz.latitude);
    const lng = Number(biz.longitude);
    try {
      map.flyTo([lat, lng], 16, { duration: 0.8 });
      setTimeout(() => {
        const marker = markerRefs.current?.[selectedBusinessId];
        if (marker) marker.openPopup();
      }, 900);
    } catch (_) { /* skip invalid coords */ }
  }, [selectedBusinessId, businesses, map, markerRefs]);

  return null;
}

export default function PlacesMap({ businesses, locale, hoveredBusinessId, selectedBusinessId, onPopupClose }) {
  const [ready, setReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);
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
        whenReady={() => setMapReady(true)}
      >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">Carto</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      
      <MapResizeHandler />
      <BoundsFitter businesses={businesses} />
      <FlyToHovered businesses={businesses} hoveredBusinessId={hoveredBusinessId} />
      <FlyToSelected businesses={businesses} selectedBusinessId={selectedBusinessId} markerRefs={markerRefs} />

      {mapReady && (
      <ClusterErrorBoundary>
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
        {businesses?.filter(hasValidCoords).map((biz) => (
          <Marker 
            key={biz.id} 
            position={[Number(biz.latitude), Number(biz.longitude)]}
            icon={biz.id === hoveredBusinessId || biz.id === selectedBusinessId ? highlightedIcon || customIcon : customIcon}
            ref={(ref) => { if (ref) markerRefs.current[biz.id] = ref; }}
            eventHandlers={{
              popupclose: () => { if (onPopupClose) onPopupClose(); },
            }}
          >
            <Popup className="custom-popup" closeButton={false} minWidth={260}>
              <div className="flex flex-col overflow-hidden bg-white p-0 m-0">
                {/* Cover image - single full-width */}
                <div className="relative h-36 w-full bg-gray-50 overflow-hidden">
                  {biz.coverGallery && biz.coverGallery[0] ? (
                    <Image 
                      src={biz.coverGallery[0]} 
                      alt={biz.businessName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <Scissors className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                  {/* Rating badge */}
                  {biz.rating > 0 && (
                    <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-lg text-[11px] font-bold text-gray-800 flex items-center gap-1 shadow-sm">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      {(biz.rating || 0).toFixed(1)}
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
                
                <div className="px-3.5 pt-3 pb-3.5">
                  <h3 className="font-bold text-gray-900 text-[14px] leading-snug truncate">{biz.businessName}</h3>
                  <div className="flex items-center text-gray-400 text-[11px] mt-1 gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{biz.city || 'Location'}</span>
                  </div>

                  {/* Services preview */}
                  {biz.services && biz.services.length > 0 && (
                    <div className="space-y-1.5 mt-2.5 pt-2.5 border-t border-gray-100">
                      {biz.services.slice(0, 2).map((s, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <span className="text-[12px] text-gray-500 truncate pr-2">{s.name}</span>
                          <span className="text-[12px] font-bold text-gray-900 whitespace-nowrap">{s.price} {s.currency}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* CTA button */}
                  <div className="mt-3">
                    {biz.showBookingButton ? (
                      <Link
                        href={`/${locale}/b/${biz.id}`}
                        className="popup-cta block w-full bg-[#244C70] text-white text-center py-2.5 rounded-xl text-[13px] font-semibold hover:bg-[#1a3a5a] transition-colors"
                      >
                        Book Now
                      </Link>
                    ) : biz.showGetDirections ? (
                      <div className="flex gap-2">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${biz.latitude},${biz.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="popup-cta flex-1 bg-[#244C70] text-white text-center py-2.5 rounded-xl text-[12px] font-semibold hover:bg-[#1a3a5a] transition-colors flex items-center justify-center gap-1"
                        >
                          <Navigation className="w-3 h-3" />
                          Directions
                        </a>
                        <Link
                          href={`/${locale}/b/${biz.id}`}
                          className="flex-1 bg-gray-50 text-gray-600 text-center py-2.5 rounded-xl text-[12px] font-semibold hover:bg-gray-100 transition-colors border border-gray-200"
                        >
                          Details
                        </Link>
                      </div>
                    ) : (biz.showCallButton || biz.showMessageButton) && biz.phone ? (
                      <div className="flex gap-2">
                        <a
                          href={`tel:${biz.phone}`}
                          className="popup-cta flex-1 bg-[#244C70] text-white text-center py-2.5 rounded-xl text-[12px] font-semibold hover:bg-[#1a3a5a] transition-colors flex items-center justify-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          Contact
                        </a>
                        <Link
                          href={`/${locale}/b/${biz.id}`}
                          className="flex-1 bg-gray-50 text-gray-600 text-center py-2.5 rounded-xl text-[12px] font-semibold hover:bg-gray-100 transition-colors border border-gray-200"
                        >
                          Details
                        </Link>
                      </div>
                    ) : (
                      <Link
                        href={`/${locale}/b/${biz.id}`}
                        className="popup-cta block w-full bg-[#244C70] text-white text-center py-2.5 rounded-xl text-[13px] font-semibold hover:bg-[#1a3a5a] transition-colors"
                      >
                        View Details
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
      </ClusterErrorBoundary>
      )}
    </MapContainer>
    </>
  );
}