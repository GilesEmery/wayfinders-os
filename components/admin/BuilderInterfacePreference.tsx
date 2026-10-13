"use client";
import {useEffect} from 'react';
// A presentation preference only; authorization is checked before this is read.
export function BuilderInterfacePreference({mode}:{mode:'modern'|'legacy'}){useEffect(()=>{document.cookie=`purposeos_builder_interface=${mode}; Path=/admin/trainings; Max-Age=86400; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;},[mode]);return null;}
