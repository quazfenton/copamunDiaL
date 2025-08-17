"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GameLocation {
  id: string;
  latitude: number;
  longitude: number;
  name: string; // For matches, this could be "Team A vs Team B"
  type: "match" | "pickup";
  details?: any; // More detailed info to display on click
}

interface MapViewProps {
  locations: GameLocation[];
  center?: { lat: number; lng: number };
  zoom?: number;
  onMarkerClick?: (location: GameLocation) => void;
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export default function MapView({
  locations,
  center = { lat: 34.052235, lng: -118.243683 }, // Default to Los Angeles
  zoom = 10,
  onMarkerClick,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.error("Google Maps API Key is not set. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.");
      return;
    }

    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: "weekly",
      libraries: ["places"],
    });

    loader.load().then(() => {
      if (mapRef.current) {
        mapInstance.current = new google.maps.Map(mapRef.current, {
          center,
          zoom,
        });
        infoWindowRef.current = new google.maps.InfoWindow();
        addMarkers(locations);
      }
    }).catch((e) => {
      console.error("Error loading Google Maps:", e);
    });

    return () => {
      // Clean up markers when component unmounts or locations change
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    };
  }, [GOOGLE_MAPS_API_KEY, center, zoom]);

  useEffect(() => {
    if (mapInstance.current) {
      addMarkers(locations);
    }
  }, [locations, mapInstance.current]);

  const addMarkers = (locations: GameLocation[]) => {
    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    locations.forEach((location) => {
      if (location.latitude && location.longitude) {
        const marker = new google.maps.Marker({
          position: { lat: location.latitude, lng: location.longitude },
          map: mapInstance.current,
          title: location.name,
        });

        marker.addListener("click", () => {
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(
              `<div class="info-window-content">
                <h3>${location.name}</h3>
                <p>Type: ${location.type === 'match' ? 'Team Match' : 'Pickup Game'}</p>
                ${location.details ? `<p>${location.details}</p>` : ''}
                <button id="marker-details-btn" class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mt-2">View Details</button>
              </div>`
            );
            infoWindowRef.current.open(mapInstance.current, marker);

            // Add event listener to the button inside the info window
            google.maps.event.addListenerOnce(infoWindowRef.current, 'domready', () => {
              document.getElementById('marker-details-btn')?.addEventListener('click', () => {
                onMarkerClick?.(location);
              });
            });
          }
        });
        markersRef.current.push(marker);
      }
    });
  };

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}