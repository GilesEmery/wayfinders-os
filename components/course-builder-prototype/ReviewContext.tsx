"use client";
import { createContext, useContext } from 'react';
import type { ReviewBundle } from '@/lib/experiences/builder/prototype/review-snapshot';
export const ReviewContext=createContext<ReviewBundle|undefined>(undefined);
export const useCourseReview=()=>useContext(ReviewContext);
