"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Bell,
  Shield,
  Database,
  Palette,
  Globe,
  Key,
  Mail,
  Save,
  Upload,
} from "lucide-react";

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@bonaso.org",
    phone: "+267 71 234 567",
    role: "M&E Manager",
    organization: "BONASO National",
  });

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    taskReminders: true,
    dataQualityAlerts: true,
    reportReady: true,
    weeklyDigest: false,
    projectUpdates: true,
  });

  const [preferences, setPreferences] = useState({
    language: "en",
    timezone: "Africa/Gaborone",
    dateFormat: "DD/MM/YYYY",
    defaultProject: "all",
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account settings and preferences"
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="preferences" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Palette className="h-4 w-4 mr-2" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="data" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Database className="h-4 w-4 mr-2" />
            Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and contact details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="/placeholder-avatar.jpg" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {profile.firstName[0]}{profile.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" className="border-border bg-transparent">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    JPG, PNG or GIF. Max 2MB.
                  </p>
                </div>
              </div>

              <Separator className="bg-border" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-foreground">First Name</Label>
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-foreground">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="bg-input border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-foreground">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="bg-input border-border text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-foreground">Role</Label>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      {profile.role}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Contact admin to change
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Organization</Label>
                  <p className="text-foreground">{profile.organization}</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Notification Preferences</CardTitle>
              <CardDescription>
                Choose which notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-foreground">Email Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive important alerts via email
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailAlerts}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, emailAlerts: checked })
                    }
                  />
                </div>
                <Separator className="bg-border" />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-foreground">Task Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Get reminded about upcoming deadlines
                    </p>
                  </div>
                  <Switch
                    checked={notifications.taskReminders}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, taskReminders: checked })
                    }
                  />
                </div>
                <Separator className="bg-border" />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-foreground">Data Quality Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Be notified when data quality issues are detected
                    </p>
                  </div>
                  <Switch
                    checked={notifications.dataQualityAlerts}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, dataQualityAlerts: checked })
                    }
                  />
                </div>
                <Separator className="bg-border" />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-foreground">Report Ready</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify when scheduled reports are generated
                    </p>
                  </div>
                  <Switch
                    checked={notifications.reportReady}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, reportReady: checked })
                    }
                  />
                </div>
                <Separator className="bg-border" />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-foreground">Weekly Digest</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive a weekly summary of activities
                    </p>
                  </div>
                  <Switch
                    checked={notifications.weeklyDigest}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, weeklyDigest: checked })
                    }
                  />
                </div>
                <Separator className="bg-border" />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-foreground">Project Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about project milestone changes
                    </p>
                  </div>
                  <Switch
                    checked={notifications.projectUpdates}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, projectUpdates: checked })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-foreground">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  className="bg-input border-border text-foreground max-w-md"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-foreground">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  className="bg-input border-border text-foreground max-w-md"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  className="bg-input border-border text-foreground max-w-md"
                />
              </div>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Key className="h-4 w-4 mr-2" />
                Update Password
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground font-medium">Status: Not Enabled</p>
                  <p className="text-sm text-muted-foreground">
                    Protect your account with 2FA using an authenticator app
                  </p>
                </div>
                <Button variant="outline" className="border-border bg-transparent">
                  <Shield className="h-4 w-4 mr-2" />
                  Enable 2FA
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Active Sessions</CardTitle>
              <CardDescription>
                Manage your active login sessions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                <div className="flex items-center gap-4">
                  <Globe className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-foreground font-medium">Current Session</p>
                    <p className="text-sm text-muted-foreground">
                      Chrome on Windows - Gaborone, Botswana
                    </p>
                    <p className="text-xs text-muted-foreground">Started: Today at 9:30 AM</p>
                  </div>
                </div>
                <Badge className="bg-primary/20 text-primary border-primary/30">Active</Badge>
              </div>
              <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 bg-transparent">
                Sign Out All Other Sessions
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Regional Settings</CardTitle>
              <CardDescription>
                Customize language, timezone, and date formats
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="language" className="text-foreground">Language</Label>
                  <Select
                    value={preferences.language}
                    onValueChange={(value) => setPreferences({ ...preferences, language: value })}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="tn">Setswana</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone" className="text-foreground">Timezone</Label>
                  <Select
                    value={preferences.timezone}
                    onValueChange={(value) => setPreferences({ ...preferences, timezone: value })}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Gaborone">Africa/Gaborone (CAT)</SelectItem>
                      <SelectItem value="Africa/Johannesburg">Africa/Johannesburg (SAST)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateFormat" className="text-foreground">Date Format</Label>
                  <Select
                    value={preferences.dateFormat}
                    onValueChange={(value) => setPreferences({ ...preferences, dateFormat: value })}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultProject" className="text-foreground">Default Project</Label>
                  <Select
                    value={preferences.defaultProject}
                    onValueChange={(value) => setPreferences({ ...preferences, defaultProject: value })}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      <SelectItem value="usaid">USAID Health Initiative</SelectItem>
                      <SelectItem value="global-fund">Global Fund Round 12</SelectItem>
                      <SelectItem value="pepfar">PEPFAR OVC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Data Export</CardTitle>
              <CardDescription>
                Export your data for backup or analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="border-border justify-start bg-transparent">
                  <Database className="h-4 w-4 mr-2" />
                  Export All Respondents (CSV)
                </Button>
                <Button variant="outline" className="border-border justify-start bg-transparent">
                  <Database className="h-4 w-4 mr-2" />
                  Export All Responses (CSV)
                </Button>
                <Button variant="outline" className="border-border justify-start bg-transparent">
                  <Database className="h-4 w-4 mr-2" />
                  Export All Indicators (CSV)
                </Button>
                <Button variant="outline" className="border-border justify-start bg-transparent">
                  <Database className="h-4 w-4 mr-2" />
                  Export All Events (CSV)
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Data Import</CardTitle>
              <CardDescription>
                Import data from external sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-foreground font-medium mb-2">
                  Drag and drop files here, or click to browse
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Supports CSV, XLSX formats. Max file size: 50MB
                </p>
                <Button variant="outline" className="border-border bg-transparent">
                  Select Files
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that affect your data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg">
                <div>
                  <p className="text-foreground font-medium">Request Account Data</p>
                  <p className="text-sm text-muted-foreground">
                    Download all data associated with your account
                  </p>
                </div>
                <Button variant="outline" className="border-border bg-transparent">
                  <Mail className="h-4 w-4 mr-2" />
                  Request
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
