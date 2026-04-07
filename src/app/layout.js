import { Geist } from "next/font/google";
import "./globals.css";
import ClientProvider from "@/components/ClientProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});


export const metadata = {
  title: "Booka.ma - Book Your Barber or Salon in Seconds",
  description: "The smartest way to book barber appointments. Instant booking, smart queue system, and mobile barber services. Download the app today!",
  keywords: ["barber", "booking", "appointment", "haircut", "barbershop", "grooming", "queue system", "booka"],
  authors: [{ name: "Booka.ma" }],
  openGraph: {
    title: "Booka.ma - Book Your Barber or Salon in Seconds",
    description: "The smartest way to book barber appointments. Instant booking, smart queue system, and mobile barber services.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} antialiased`}
      >
        <ClientProvider>
          {children}
        </ClientProvider>
      </body>
    </html>
  );
}
