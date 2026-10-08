"use client";

import { useEffect, useState } from "react";

export function CoursePublishNotice({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false);
      const url = new URL(window.location.href);
      url.searchParams.delete("saved");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, []);
  return visible ? <p className="course-builder-notice" role="status">{message}</p> : null;
}
