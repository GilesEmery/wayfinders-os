import assert from 'node:assert/strict';
import test from 'node:test';
import {MarkdownManager} from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import {CourseAlignment} from '../../lib/experiences/builder/course-alignment.ts';
import {load} from '../performance/offline-module.mjs';
import {Mark} from '@tiptap/core';
const fontStyle=load('lib/experiences/builder/course-font-style.ts',{});
const {CourseFontOverride}=load('lib/experiences/builder/course-font-override.ts',{'@tiptap/core':{Mark},'./course-font-style':fontStyle});
const {COURSE_FONT_PACKAGES,applyCourseFontFamilies,validateCourseTypography,courseTypographyVariables}=load('lib/experiences/builder/course-typography.ts',{'./course-font-style':fontStyle});
const markdown=new MarkdownManager({extensions:[StarterKit,CourseAlignment,CourseFontOverride]});
test('all alignment options round-trip formatted paragraphs and explicit 14px overrides',()=>{for(const alignment of ['left','center','right']){const source=`:::course-align-${alignment}\n**Hello** [[font:14;-;-]]custom[[/font]]\n:::end-course-align`;const doc=markdown.parse(source);assert.equal(doc.content[0].type,'courseAlignment');assert.equal(doc.content[0].attrs.alignment,alignment);const serialized=markdown.serialize(doc);assert.ok(serialized.includes('[[font:14;-;-]]'));assert.equal(markdown.parse(serialized).content[0].attrs.alignment,alignment);}});
test('font packages preserve sizes/spacing while separating headings and body',()=>{for(const pack of Object.values(COURSE_FONT_PACKAGES)){const before={h4:{size:17,lineHeight:1.8,spacing:22},body:{size:16}};const result=validateCourseTypography(applyCourseFontFamilies(before,pack.heading,pack.body));assert.equal(result.h4.family,pack.heading);assert.equal(result.body.family,pack.body);assert.equal(result.small.family,pack.body);assert.equal(result.h4.size,17);assert.equal(result.h4.spacing,22);assert.equal(before.h4.family,undefined);assert.ok(courseTypographyVariables(result)['--course-body-family']);}});

test('named Google families survive typography validation and rich-text overrides',()=>{for(const family of fontStyle.COURSE_FONT_LIBRARY){const config=validateCourseTypography({body:{family}});assert.equal(config.body.family,family);const text=`[[font:14;${family};#123456]]Named font[[/font]]`;assert.ok(JSON.stringify(markdown.parse(text)).includes(`"family":"${family}"`));assert.ok(markdown.serialize(markdown.parse(text)).includes(`;${family};`));}});

test('course configuration reload retains explicit typography and leaves unconfigured courses unchanged',()=>{const typography=load('lib/experiences/builder/course-typography.ts',{'./course-font-style':fontStyle});const {normalizeCourseConfiguration}=load('lib/experiences/builder/course-configuration.ts',{'./course-typography':typography});assert.equal(normalizeCourseConfiguration({}).typography,undefined);const input={typography:{body:{family:'lato',size:18},h1:{family:'playfair-display'}}};const config=normalizeCourseConfiguration(input);assert.equal(config.typography.body.family,'lato');assert.equal(config.typography.body.size,18);assert.equal(config.typography.h1.family,'playfair-display');assert.equal(input.typography.body.family,'lato');});

test('font library has 16 distinct named choices with the existing fonts at positions 9–11',()=>{assert.equal(fontStyle.COURSE_FONT_LIBRARY.length,16);assert.equal(new Set(fontStyle.COURSE_FONT_LIBRARY).size,16);assert.equal(fontStyle.COURSE_FONT_LIBRARY.slice(8,11).join(','),'editorial,sans,mono');});
