"use client";

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Main reusable FAQ component
export const FAQ = ({ 
  title = "FAQs",
  subtitle = "Frequently Asked Questions",
  categories,
  faqData,
  className,
  ...props 
}: {
  title?: string;
  subtitle?: string;
  categories: Record<string, string>;
  faqData: Record<string, Array<{ question: string; answer: string }>>;
  className?: string;
  [key: string]: any;
}) => {
  const categoryKeys = Object.keys(categories);
  const [selectedCategory, setSelectedCategory] = useState(categoryKeys[0]);

  return (
    <section 
      className={cn(
        "relative overflow-hidden bg-background px-4 py-4 text-foreground",
        className
      )}
      {...props}
    >
      <FAQHeader title={title} subtitle={subtitle} />
      <FAQTabs 
        categories={categories}
        selected={selectedCategory} 
        setSelected={setSelectedCategory} 
      />
      <FAQList 
        faqData={faqData}
        selected={selectedCategory} 
      />
    </section>
  );
};

const FAQHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
        <div className="text-center mb-16">
          <Badge className="mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0 px-6 py-2 text-sm font-semibold">
            Questions fréquentes
          </Badge>
          <h2 className="text-4xl md:text-6xl font-bold mb-8">
            <span className="bg-gradient-to-r from-gray-900 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Tout savoir sur
            </span>
            <br />
            <span className="text-gray-900">le bail notarié</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez les réponses aux questions les plus fréquentes sur notre service et le bail notarié
          </p>
        </div>
);

const FAQTabs = ({ 
  categories, 
  selected, 
  setSelected 
}: { 
  categories: Record<string, string>; 
  selected: string; 
  setSelected: (key: string) => void;
}) => (
  <div className="relative z-10 flex flex-wrap items-center justify-center gap-4">
    {Object.entries(categories).map(([key, label]) => (
      <button
        key={key}
        onClick={() => setSelected(key)}
        className={cn(
          "relative overflow-hidden whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-medium transition-colors duration-500",
          selected === key
            ? "border-blue-600 text-white"
            : "border-gray-200 bg-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
        )}
      >
        <span className="relative z-10">{label}</span>
        <AnimatePresence>
          {selected === key && (
            <motion.span
              initial={{ y: "100%" }}
              animate={{ y: "0%" }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.5, ease: "backIn" }}
              className="absolute inset-0 z-0 bg-gradient-to-r from-blue-600 to-indigo-600"
            />
          )}
        </AnimatePresence>
      </button>
    ))}
  </div>
);

const FAQList = ({ 
  faqData, 
  selected 
}: { 
  faqData: Record<string, Array<{ question: string; answer: string }>>; 
  selected: string;
}) => (
  <div className="mx-auto mt-12 max-w-3xl">
    <AnimatePresence mode="wait">
      {Object.entries(faqData).map(([category, questions]) => {
        if (selected === category) {
          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5, ease: "backIn" }}
              className="space-y-4"
            >
              {questions.map((faq, index) => (
                <FAQItem key={index} {...faq} />
              ))}
            </motion.div>
          );
        }
        return null;
      })}
    </AnimatePresence>
  </div>
);

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      animate={isOpen ? "open" : "closed"}
      className={cn(
        "rounded-xl border transition-colors",
        isOpen ? "bg-blue-50/50 border-blue-200" : "bg-white border-gray-200"
      )}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left"
      >
        <span
          className={cn(
            "text-lg font-medium transition-colors",
            isOpen ? "text-gray-900" : "text-gray-700"
          )}
        >
          {question}
        </span>
        <motion.span
          variants={{
            open: { rotate: "45deg" },
            closed: { rotate: "0deg" },
          }}
          transition={{ duration: 0.2 }}
        >
          <Plus
            className={cn(
              "h-5 w-5 transition-colors",
              isOpen ? "text-blue-600" : "text-gray-500"
            )}
          />
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ 
          height: isOpen ? "auto" : "0px", 
          marginBottom: isOpen ? "16px" : "0px" 
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="overflow-hidden px-4"
      >
        <p className="text-gray-600 leading-relaxed">{answer}</p>
      </motion.div>
    </motion.div>
  );
};



