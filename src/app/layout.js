import { Geist } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
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
    <ClerkProvider
      appearance={{
        layout: {
          socialButtonsPlacement: 'bottom',
          socialButtonsVariant: 'iconButton',
        },
        elements: {
          // Fix RTL modal header overlap issue
          modalContent: {
            direction: 'ltr',
          },
          userProfileModalContent: {
            direction: 'ltr',
          },
          navbarButton: {
            marginInlineStart: '0',
            marginInlineEnd: 'auto',
          },
          headerTitle: {
            direction: 'ltr',
          },
          modalCloseButton: {
            position: 'absolute',
            right: '1rem',
            left: 'auto',
          },
          // Hide profile photo, username, and "Update profile" from Clerk settings
          profileSection__profile: {
            display: 'none',
          },
        },
      }}
    >
      <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth">
        <body
          className={`${geistSans.variable} antialiased`}
        >
          <ClientProvider>
            {children}
          </ClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
