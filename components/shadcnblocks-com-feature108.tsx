"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layout, Pointer, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TabContent {
  badge: string;
  title: string;
  description: string;
  buttonText: string;
  imageSrc: string;
  imageAlt: string;
}

interface Tab {
  value: string;
  icon: React.ReactNode;
  label: string;
  content: TabContent;
  handleStart: () => void;
}

interface Feature108Props {
  tabs?: Tab[];
}

const Feature108 = ({
  tabs = [],
}: Feature108Props) => {
  return (
    <section className="py-6">
      <div className="container mx-auto">
        <Tabs defaultValue={tabs[0].value} className="mt-8">
          <TabsList className="w-full h-auto p-2 rounded-4xl " >
            {tabs.map((tab) => (
              <TabsTrigger
                className="py-2 sm:py-4 rounded-4xl "
                key={tab.value}
                value={tab.value}
              >
                {tab.icon} {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="mx-auto mt-8 max-w-screen-xl rounded-2xl bg-accent p-6 lg:p-16">
            {tabs.map((tab) => (
              <TabsContent
                key={tab.value}
                value={tab.value}
                className="grid place-items-center gap-20 lg:grid-cols-2 lg:gap-10 "
              >
                <div className="flex flex-col gap-5">
                  <Badge variant="outline" className="w-fit bg-background">
                    {tab.content.badge}
                  </Badge>
                  <h3 className="text-3xl font-semibold lg:text-5xl">
                    {tab.content.title}
                  </h3>
                  <p className="text-muted-foreground lg:text-lg">
                    {tab.content.description}
                  </p>
                  <Button className="mt-2.5 w-fit gap-2 bg-[#4373f5] hover:bg-blue-700 text-white sm:text-lg text-md px-8 py-3 h-auto rounded-xl shadow-md transition-all duration-200" size="lg" onClick={tab.handleStart}>
                    {tab.content.buttonText}
                  </Button>
                </div>
                <img
                  src={tab.content.imageSrc}
                  alt={tab.content.imageAlt}
                  className="rounded-xl"
                />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </section>
  );
};

export { Feature108 };
