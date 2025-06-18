"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import { Loader2 } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db, isFirestoreActive } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, type FirestoreError } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription as ShadFormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

const submissionFormSchema = z.object({
  gameName: z.string().min(1, { message: "অনুগ্রহ করে আপনার গেমের নাম লিখুন।" }),
  uid: z.string().min(1, { message: "অনুগ্রহ করে আপনার গেম UID লিখুন।" }),
  level: z.string().min(1, { message: "অনুগ্রহ করে আপনার বর্তমান লেভেল লিখুন।" }).regex(/^[0-9]+$/, { message: "লেভেল শুধুমাত্র সংখ্যা হতে হবে।" }),
});

type SubmissionFormValues = z.infer<typeof submissionFormSchema>;

export default function SubmissionPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionFormSchema),
    defaultValues: {
      gameName: "",
      uid: "",
      level: "",
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.replace('/login');
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  async function onSubmit(values: SubmissionFormValues) {
    console.log("DEBUG: Submission onSubmit triggered with values:", values);
    setIsSubmitting(true);

    const currentUserForSubmission = auth.currentUser;

    if (!currentUserForSubmission || !currentUserForSubmission.uid) {
      toast({
        variant: "destructive",
        title: "ব্যবহারকারী যাচাইকরণ ত্রুটি",
        description: "ফর্ম জমা দেওয়ার আগে আপনাকে সঠিকভাবে লগইন করতে হবে। অনুগ্রহ করে পৃষ্ঠাটি রিফ্রেশ করুন অথবা পুনরায় লগইন করুন।",
      });
      setIsSubmitting(false);
      console.log("DEBUG: No current user or UID, exiting onSubmit.");
      return;
    }

    const firestoreReady = isFirestoreActive();
    
    if (!firestoreReady) {
      console.error("DEBUG: SubmissionPage - Firestore not fully active/configured.");
      toast({
        variant: "destructive",
        title: "পরিষেবা ত্রুটি",
        description: "ডাটাবেস পরিষেবার সাথে সংযোগ স্থাপন করা যাচ্ছে না। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।",
      });
      setIsSubmitting(false);
      console.log("DEBUG: Firestore not ready, exiting onSubmit.");
      return;
    }
    
    try {
      console.log("DEBUG: Entered try block. User:", currentUserForSubmission.email);
      
      const submissionData = {
        userId: currentUserForSubmission.uid,
        userEmail: currentUserForSubmission.email,
        gameName: values.gameName,
        uid: values.uid,
        level: values.level,
        status: "pending",
        submittedAt: serverTimestamp(),
      };

      console.log("DEBUG: Attempting to add document to 'submissions' collection with data:", submissionData);
      await addDoc(collection(db, "submissions"), submissionData);
      console.log("DEBUG: Document added to 'submissions' collection successfully.");

      toast({
        title: "তথ্য জমা দেওয়া সফল হয়েছে",
        description: "আপনার তথ্য জমা দেওয়া হয়েছে। ২৪ ঘণ্টার মধ্যে একটি ইমেইল পাবেন।",
      });
      form.reset();
      console.log("DEBUG: Form reset successfully.");

    } catch (error) {
      console.error("তথ্য জমা দেওয়ার সময় বিস্তারিত ত্রুটি (DEBUG): ", error); 
      let errorTitle = "জমা দিতে ব্যর্থ";
      let errorMessage = "ফর্ম জমা দেওয়ার সময় একটি অজানা ত্রুটি হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।";
      
      if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
        const firebaseError = error as { code: string; message: string }; 
        console.error(`DEBUG: Firebase ত্রুটি - কোড: ${firebaseError.code}, বার্তা: ${firebaseError.message}`);
        switch (firebaseError.code) {
          case 'permission-denied': 
            errorTitle = "অনুমতি ত্রুটি";
            errorMessage = "ফর্ম জমা দেওয়ার অনুমতি নেই। এটি Firestore নিরাপত্তা বিধির কারণে হতে পারে। অ্যাডমিনের সাথে যোগাযোগ করুন অথবা Rules পরীক্ষা করুন।";
            break;
          case 'unavailable':
             errorTitle = "সার্ভার ত্রুটি";
            errorMessage = "সার্ভারের সাথে সংযোগ স্থাপন করা যাচ্ছে না। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন অথবা কিছুক্ষণ পর আবার চেষ্টা করুন।";
            break;
          case 'deadline-exceeded':
             errorTitle = "সময়সীমা অতিক্রম";
             errorMessage = "ফর্ম জমা দিতে বেশি সময় লাগছে। আপনার ইন্টারনেট সংযোগ ধীরগতির হতে পারে। অনুগ্রহ করে আবার চেষ্টা করুন।";
             break;
          default:
            errorMessage = `একটি ত্রুটি হয়েছে: ${firebaseError.message || 'Unknown Firebase error'}. কোড: ${firebaseError.code}`;
        }
      } else if (error instanceof Error) {
         console.error(`DEBUG: সাধারণ ত্রুটি: ${error.message}`);
         if (error.message.toLowerCase().includes("offline") || error.message.toLowerCase().includes("network error")) {
          errorTitle = "নেটওয়ার্ক ত্রুটি";
          errorMessage = "আপনি অফলাইনে আছেন বলে মনে হচ্ছে অথবা নেটওয়ার্কে সমস্যা হচ্ছে। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন এবং আবার চেষ্টা করুন।";
        } else {
          errorMessage = `একটি ত্রুটি হয়েছে: ${error.message}`;
        }
      }

      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorMessage,
      });
    } finally {
        console.log("DEBUG: Entered finally block.");
        setIsSubmitting(false);
        console.log("DEBUG: isSubmitting set to false in finally block.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-foreground">লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-slate-900">
      <AppHeader />
      <title>তথ্য জমা দিন - Gamer's Launchpad</title>
      <main className="flex-grow flex flex-col items-center justify-center p-6">
        <Card className="w-full max-w-lg shadow-2xl bg-card">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-center">আপনার তথ্য জমা দিন</CardTitle>
            <CardDescription className="text-center">
              আপনার গেমিং প্রোফাইলের সঠিক নাম, UID এবং লেভেল জমা দিন।
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="gameName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>আপনার গেম আইডির নাম</FormLabel>
                      <FormControl>
                        <Input placeholder="আপনার গেম আইডির নাম লিখুন" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="uid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>আপনার গেম UID</FormLabel>
                      <FormControl>
                        <Input placeholder="উদাহরণ: 1234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>আপনার বর্তমান লেভেল</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="উদাহরণ: 70" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full text-lg py-3 bg-primary hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      জমা দেওয়া হচ্ছে...
                    </>
                  ) : (
                    "জমা দিন"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-4 p-6 pt-4 text-xs text-muted-foreground">
            <p className="text-center">আপনার সকল তথ্য আমাদের কাছে সুরক্ষিত থাকবে এবং যাচাইয়ের পর ২০ ডায়মন্ড পুরষ্কার পাঠানো হবে।</p>
            <Button variant="outline" className="w-full max-w-xs" asChild>
              <Link href="/">হোমে ফিরে যান</Link>
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
    

    