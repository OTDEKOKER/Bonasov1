"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "./loading"; // Import the Loading component
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  ExternalLink,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";
import { mockSocialPosts } from "@/lib/mock-data";

// Platform icons
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.073-1.689-.073-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export default function SocialPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const searchParams = useSearchParams();

  const filteredPosts = mockSocialPosts.filter((post) => {
    const matchesSearch = post.content
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesPlatform =
      platformFilter === "all" || post.platform === platformFilter;
    return matchesSearch && matchesPlatform;
  });

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "facebook":
        return <FacebookIcon className="h-4 w-4" />;
      case "twitter":
        return <TwitterIcon className="h-4 w-4" />;
      case "instagram":
        return <InstagramIcon className="h-4 w-4" />;
      case "linkedin":
        return <LinkedInIcon className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case "facebook":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "twitter":
        return "bg-sky-500/20 text-sky-400 border-sky-500/30";
      case "instagram":
        return "bg-pink-500/20 text-pink-400 border-pink-500/30";
      case "linkedin":
        return "bg-blue-600/20 text-blue-300 border-blue-600/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const totalEngagement = mockSocialPosts.reduce(
    (acc, post) => acc + post.likes + post.comments + post.shares,
    0
  );

  const avgEngagement = Math.round(totalEngagement / mockSocialPosts.length);

  return (
    <Suspense fallback={<Loading />}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Social Media"
          description="Track and analyze social media posts and engagement metrics"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Social Media" },
          ]}
        >
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Log Social Media Post</DialogTitle>
                <DialogDescription>
                  Track a new social media post and its engagement metrics
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="post-platform">Platform</Label>
                  <Select>
                    <SelectTrigger id="post-platform">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="twitter">Twitter / X</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="post-content">Post Content</Label>
                  <Textarea
                    id="post-content"
                    placeholder="Enter the post content..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="post-url">Post URL</Label>
                  <Input id="post-url" placeholder="https://" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="post-likes">Likes</Label>
                    <Input id="post-likes" type="number" placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="post-comments">Comments</Label>
                    <Input id="post-comments" type="number" placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="post-shares">Shares</Label>
                    <Input id="post-shares" type="number" placeholder="0" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="post-date">Post Date</Label>
                  <Input id="post-date" type="date" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsDialogOpen(false)}>Log Post</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PageHeader>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="twitter">Twitter / X</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Posts</CardDescription>
              <CardTitle className="text-2xl">{mockSocialPosts.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Engagement</CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl">
                {totalEngagement.toLocaleString()}
                <TrendingUp className="h-4 w-4 text-success" />
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg. Engagement</CardDescription>
              <CardTitle className="text-2xl">{avgEngagement}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Reach</CardDescription>
              <CardTitle className="text-2xl">
                {mockSocialPosts
                  .reduce((acc, post) => acc + post.reach, 0)
                  .toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Platform Breakdown */}
        <div className="grid gap-4 sm:grid-cols-4">
          {["facebook", "twitter", "instagram", "linkedin"].map((platform) => {
            const platformPosts = mockSocialPosts.filter(
              (p) => p.platform === platform
            );
            const engagement = platformPosts.reduce(
              (acc, p) => acc + p.likes + p.comments + p.shares,
              0
            );
            return (
              <Card key={platform}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge className={getPlatformColor(platform)}>
                      {getPlatformIcon(platform)}
                      <span className="ml-1 capitalize">{platform}</span>
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {platformPosts.length} posts
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {engagement.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    total engagement
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Posts List */}
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <Card key={post.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${getPlatformColor(post.platform)}`}
                  >
                    {getPlatformIcon(post.platform)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm line-clamp-2">{post.content}</p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View on {post.platform}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        {post.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        {post.comments}
                      </span>
                      <span className="flex items-center gap-1">
                        <Share2 className="h-4 w-4" />
                        {post.shares}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {post.reach.toLocaleString()} reach
                      </span>
                      <span className="ml-auto">
                        {new Date(post.postedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Share2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">No posts found</h3>
              <p className="text-muted-foreground mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          </Card>
        )}
      </div>
    </Suspense>
  );
}

// Loading component
function Loading() {
  return null;
}
