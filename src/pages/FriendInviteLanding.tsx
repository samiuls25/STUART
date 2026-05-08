import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, UserPlus } from "lucide-react";

import Navbar from "../components/layout/Navbar";
import AuthModal from "../components/auth/AuthModal";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Button } from "../components/ui/button";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../hooks/use-toast";
import {
  resolveFriendInviteToken,
  sendFriendRequestByUserId,
  type ResolvedFriendInvite,
} from "../lib/friends";

const FriendInviteLanding = () => {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [issuer, setIssuer] = useState<ResolvedFriendInvite | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const raw = token?.trim() || "";
      if (raw.length < 16) {
        if (!cancelled) {
          setIssuer(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const resolved = await resolveFriendInviteToken(raw);
        if (!cancelled) {
          setIssuer(resolved);
        }
      } catch {
        if (!cancelled) setIssuer(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleInviteOutcome = useCallback(
    (issuerId: string) => {
      return async () => {
        setSending(true);
        try {
          const result = await sendFriendRequestByUserId(issuerId);

          if (result.ok && result.outcome === "already_friends") {
            toast({
              title: "Already friends",
              description: "You're connected with this person already.",
            });
            navigate("/friends", { replace: true });
            return;
          }

          if (result.ok && result.outcome === "sent") {
            toast({
              title: "Friend request sent",
              description: "They'll see your request in STUART.",
            });
            navigate("/friends", { replace: true });
            return;
          }

          if (!result.ok && result.outcome === "self") {
            toast({
              title: "This is your link",
              description: "Share it with others — you can't add yourself.",
              variant: "destructive",
            });
            return;
          }

          if (!result.ok && result.outcome === "pending_outbound") {
            toast({
              title: "Request already pending",
              description: "You already sent them a friend request.",
            });
            navigate("/friends", { replace: true });
            return;
          }

          if (!result.ok && result.outcome === "pending_inbound") {
            toast({
              title: "They already invited you",
              description: "Open Friends → Requests to accept.",
            });
            navigate("/friends", { replace: true, state: { openRequestsTab: true } });
            return;
          }

          if (!result.ok && result.outcome === "blocked") {
            toast({
              title: "Can't send request",
              description: result.message || "This connection isn't available.",
              variant: "destructive",
            });
            return;
          }

          if (!result.ok && result.outcome === "error") {
            toast({
              title: "Something went wrong",
              description: result.message ?? "Try again in a moment.",
              variant: "destructive",
            });
            return;
          }
        } finally {
          setSending(false);
          setConfirmOpen(false);
        }
      };
    },
    [navigate, toast],
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-lg mx-auto px-6 pb-16 pt-[104px] sm:pt-[112px]">
        {loading ? (
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Checking invite…</p>
          </div>
        ) : issuer === null || !issuer ? (
          <div className="text-center space-y-4">
            <h1 className="font-heading text-2xl font-bold text-foreground">Invite unavailable</h1>
            <p className="text-sm text-muted-foreground">
              This link may have expired, been revoked, or is invalid.
            </p>
            <Button asChild variant="outline">
              <Link to="/friends">Back to Friends</Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 space-y-6 text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-muted overflow-hidden flex items-center justify-center ring-2 ring-primary/20">
              {issuer.issuerAvatarUrl ? (
                <img src={issuer.issuerAvatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-heading font-semibold text-primary">
                  {issuer.issuerName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
                Add {issuer.issuerName}?
              </h1>
              <p className="text-sm text-muted-foreground">
                They shared this link so you can send them a friend request on STUART.
              </p>
            </div>

            {!user ? (
              <>
                <Button className="w-full" onClick={() => setShowAuth(true)}>
                  Sign in to continue
                </Button>
                <p className="text-xs text-muted-foreground">
                  After signing in, you'll confirm sending the request.
                </p>
              </>
            ) : user.id === issuer.issuerId ? (
              <p className="text-sm text-muted-foreground">
                This invite points to you. Share your link from{" "}
                <Link to="/friends" className="text-primary underline font-medium">
                  Friends
                </Link>
                .
              </p>
            ) : (
              <>
                <Button className="w-full gap-2" onClick={() => setConfirmOpen(true)}>
                  <UserPlus className="w-4 h-4" />
                  Continue
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  asChild
                >
                  <Link to="/friends">Cancel</Link>
                </Button>
              </>
            )}
          </div>
        )}
      </main>

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogTitle>Send friend request?</AlertDialogTitle>
          <AlertDialogDescription>
            You'll send a friend request to{" "}
            <span className="font-medium text-foreground">{issuer?.issuerName}</span>.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={sending}
              className="border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Back
            </AlertDialogCancel>
            <Button
              type="button"
              disabled={sending || !issuer}
              onClick={() => {
                if (issuer) void handleInviteOutcome(issuer.issuerId)();
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {sending ? "Sending…" : "Send request"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FriendInviteLanding;
