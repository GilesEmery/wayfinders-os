import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CourseBuilderPrototype } from "@/components/course-builder-prototype/CourseBuilderPrototype";
export const metadata:Metadata={title:"Course Builder · Fictional Prototype",robots:{index:false,follow:false}};
export default function PrototypePage(){if(process.env.NODE_ENV==="production")notFound();return <CourseBuilderPrototype/>;}
