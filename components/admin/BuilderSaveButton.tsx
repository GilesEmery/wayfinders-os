"use client";
import type {ButtonHTMLAttributes} from 'react';
export function BuilderSaveButton({children='Save changes',className='',type='submit',...props}:ButtonHTMLAttributes<HTMLButtonElement>){return <button {...props} type={type} className={`builder-save-changes ${className}`}>{children}</button>;}
