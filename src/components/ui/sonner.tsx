"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = (props: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        style: {
          background: "#1e1913",
          color: "#ede6d6",
          border: "1px solid rgba(201,162,39,.3)",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
