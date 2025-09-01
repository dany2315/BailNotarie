"use client";

import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageCircle, Send, User, Calendar, RefreshCw, Plus, Shield } from "lucide-react";
import { formatDate } from '@/lib/blog-utils';
import ReCAPTCHA from 'react-google-recaptcha';
import '@/styles/recaptcha-modal.css';

interface Comment {
  id: string;
  name: string;
  email: string;
  content: string;
  createdAt: Date;
  isApproved: boolean;
}

interface CommentsSectionProps {
  articleId: string;
  comments: Comment[];
  onOpenModal?: () => void;
}

export interface CommentsSectionRef {
  openModal: () => void;
}

export const CommentsSection = forwardRef<CommentsSectionRef, CommentsSectionProps>(
  ({ articleId, comments, onOpenModal }, ref) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    content: ''
  });
  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    email: '',
    content: '',
    captcha: ''
  });
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [localComments, setLocalComments] = useState(comments);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fonction pour réinitialiser le reCAPTCHA
  const resetRecaptcha = () => {
    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
    }
    setCaptchaToken(null);
    setFieldErrors(prev => ({ ...prev, captcha: '' }));
  };

  // Fonction pour réinitialiser le formulaire
  const resetForm = () => {
    setFormData({ name: '', email: '', content: '' });
    setFieldErrors({ name: '', email: '', content: '', captcha: '' });
    resetRecaptcha();
  };

  // Fonction pour gérer l'ouverture/fermeture du modal
  const handleModalChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      resetForm();
    } else {
      // S'assurer que le reCAPTCHA se charge correctement
      setTimeout(() => {
        if (recaptchaRef.current) {
          recaptchaRef.current.reset();
        }
        // Forcer les styles du reCAPTCHA
        const recaptchaElements = document.querySelectorAll('.g-recaptcha, .g-recaptcha *');
        recaptchaElements.forEach((element) => {
          if (element instanceof HTMLElement) {
            element.style.zIndex = '99999';
            element.style.pointerEvents = 'auto';
            element.style.position = 'relative';
          }
        });
      }, 200);
    }
  };

  // Fonction pour s'assurer que les dates sont correctement parsées
  const parseCommentDate = (date: any): Date => {
    if (date instanceof Date) {
      return date;
    }
    if (typeof date === 'string') {
      return new Date(date);
    }
    return new Date();
  };

  // Exposer la fonction openModal via ref
  useImperativeHandle(ref, () => ({
    openModal: () => {
      setIsModalOpen(true);
      // S'assurer que le reCAPTCHA se charge correctement
      setTimeout(() => {
        if (recaptchaRef.current) {
          recaptchaRef.current.reset();
        }
        // Forcer les styles du reCAPTCHA
        const recaptchaElements = document.querySelectorAll('.g-recaptcha, .g-recaptcha *');
        recaptchaElements.forEach((element) => {
          if (element instanceof HTMLElement) {
            element.style.zIndex = '99999';
            element.style.pointerEvents = 'auto';
            element.style.position = 'relative';
          }
        });
      }, 300);
    }
  }));

  // Tous les commentaires sont approuvés (captcha validé)
  const approvedComments = localComments.filter(comment => comment.isApproved);

  // Log pour débogage
  console.log('🔍 CommentsSection props:', { 
    articleId, 
    commentsCount: comments.length,
    totalCommentsCount: localComments.length,
    approvedCommentsCount: approvedComments.length
  });

  // Rafraîchissement automatique des commentaires toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshComments();
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, [articleId]);

  // Fonction pour gérer le changement de reCAPTCHA
  const handleRecaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
    if (token) {
      setFieldErrors(prev => ({ ...prev, captcha: '' }));
    } else {
      setFieldErrors(prev => ({ ...prev, captcha: 'Veuillez valider le reCAPTCHA' }));
    }
  };

  // Fonction pour gérer le chargement du reCAPTCHA
  const handleRecaptchaLoad = () => {
    console.log('reCAPTCHA chargé');
    // S'assurer que les événements sont bien attachés
    setTimeout(() => {
      const recaptchaElement = document.querySelector('.g-recaptcha');
      if (recaptchaElement && recaptchaElement instanceof HTMLElement) {
        recaptchaElement.style.zIndex = '99999';
        recaptchaElement.style.pointerEvents = 'auto';
        recaptchaElement.style.position = 'relative';
      }
    }, 100);
  };

  // Validation en temps réel
  const validateField = (field: string, value: string) => {
    let error = '';
    
    switch (field) {
      case 'name':
        if (!value.trim()) {
          error = 'Le nom est requis';
        } else if (value.trim().length < 2) {
          error = 'Le nom doit contenir au moins 2 caractères';
        }
        break;
      case 'email':
        if (!value.trim()) {
          error = 'L\'email est requis';
        } else {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            error = 'L\'email n\'est pas valide';
          }
        }
        break;
      case 'content':
        if (!value.trim()) {
          error = 'Le commentaire est requis';
        } else if (value.trim().length < 10) {
          error = 'Le commentaire doit contenir au moins 10 caractères';
        } else if (value.trim().length > 1000) {
          error = 'Le commentaire ne peut pas dépasser 1000 caractères';
        }
        break;
    }
    
    return error;
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validation en temps réel
    const error = validateField(field, value);
    setFieldErrors(prev => ({ ...prev, [field]: error }));
  };

  // Vérifier si le formulaire est valide
  const isFormValid = () => {
    return (
      formData.name.trim().length >= 2 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
      formData.content.trim().length >= 10 &&
      formData.content.trim().length <= 1000 &&
      captchaToken !== null &&
      articleId
    );
  };

  // Fonction pour rafraîchir les commentaires depuis le serveur
  const refreshComments = async () => {
    try {
      const response = await fetch(`/api/comments?articleId=${articleId}`);
      if (response.ok) {
        const data = await response.json();
        setLocalComments(data.comments);
      }
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des commentaires:', error);
    }
  };

  // Fonction de validation côté client
  const validateForm = () => {
    const errors: string[] = [];

    // Validation du nom
    if (!formData.name.trim()) {
      errors.push('Le nom est requis');
    } else if (formData.name.trim().length < 2) {
      errors.push('Le nom doit contenir au moins 2 caractères');
    }

    // Validation de l'email
    if (!formData.email.trim()) {
      errors.push('L\'email est requis');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.push('L\'email n\'est pas valide');
      }
    }

    // Validation du contenu
    if (!formData.content.trim()) {
      errors.push('Le commentaire est requis');
    } else if (formData.content.trim().length < 10) {
      errors.push('Le commentaire doit contenir au moins 10 caractères');
    } else if (formData.content.trim().length > 1000) {
      errors.push('Le commentaire ne peut pas dépasser 1000 caractères');
    }

    // Validation du reCAPTCHA
    if (!captchaToken) {
      errors.push('Veuillez valider le reCAPTCHA');
    }

    // Validation de l'articleId
    if (!articleId) {
      errors.push('Erreur technique: ID de l\'article manquant');
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation côté client
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      alert(`Erreurs de validation:\n${validationErrors.join('\n')}`);
      return;
    }

    // Confirmation avant envoi
    const confirmSend = confirm(
      `Confirmer l'envoi du commentaire ?\n\n` +
      `Nom: ${formData.name}\n` +
      `Email: ${formData.email}\n` +
      `Commentaire: ${formData.content.substring(0, 100)}${formData.content.length > 100 ? '...' : ''}`
    );

    if (!confirmSend) {
      return;
    }

    setIsSubmitting(true);

    // Log des données envoyées pour débogage
    const requestData = {
      ...formData,
      articleId,
      captchaToken
    };
    console.log('📤 Données envoyées à l\'API:', { ...requestData, email: '[MASKED]', captchaToken: '[MASKED]' });

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('📥 Réponse reçue:', response.status, response.statusText);

      const responseData = await response.json();
      console.log('📋 Données de réponse:', responseData);

      if (response.ok) {
        // Ajouter le nouveau commentaire à la liste locale
        const newComment = {
          id: responseData.comment.id,
          name: formData.name,
          email: formData.email,
          content: formData.content,
          createdAt: new Date(),
          isApproved: responseData.comment.isApproved, // Utiliser le statut retourné par l'API
          articleId: articleId
        };
        
        setLocalComments(prev => [newComment, ...prev]);
        setFormData({ name: '', email: '', content: '' });
        setFieldErrors({ name: '', email: '', content: '', captcha: '' });
        resetRecaptcha();
        
        // Fermer le modal
        setIsModalOpen(false);
        
        // Afficher le message de succès
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 5000); // Masquer après 5 secondes
        
        // Scroll vers le nouveau commentaire
        setTimeout(() => {
          const newCommentElement = document.getElementById(`comment-${newComment.id}`);
          if (newCommentElement) {
            newCommentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      } else {
        // Afficher les détails de l'erreur
        if (responseData.details) {
          const errorMessages = responseData.details.map((error: any) => error.message).join('\n');
          alert(`Erreur de validation:\n${errorMessages}`);
        } else {
          alert(`Erreur: ${responseData.error || 'Erreur lors de l\'envoi du commentaire'}`);
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      alert('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Message de succès */}
      {showSuccessMessage && (
        <Card className="p-4 bg-green-50 border-green-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-3 text-green-800">
            <div className="p-2 bg-green-100 rounded-full">
              <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <p className="font-semibold text-lg">Commentaire publié !</p>
              <p className="text-green-700 text-sm">
                Votre commentaire est maintenant visible sur l'article.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Bouton pour ouvrir le modal de commentaire */}
      <div className="flex justify-center">
        <Dialog open={isModalOpen} onOpenChange={handleModalChange}>
          <DialogContent className="w-[95vw] max-w-[500px] max-h-[95vh] overflow-hidden comment-modal mx-auto flex flex-col">
            <DialogHeader className="text-center pb-4 border-b border-gray-100 flex-shrink-0">
              <DialogTitle className="flex items-center justify-center gap-2 text-xl font-semibold text-gray-800">
                <div className="p-2 bg-blue-100 rounded-full">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                </div>
                Laisser un commentaire
              </DialogTitle>
              <DialogDescription className="mt-3 text-gray-600 text-sm leading-relaxed">
                Partagez votre avis sur cet article. Votre commentaire sera publié immédiatement après validation.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-1 scrollable-content">
              <form onSubmit={handleSubmit} className="space-y-4 mt-4 pb-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="mb-2 block text-sm font-medium">Nom *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    required
                    placeholder="Votre nom"
                    className={`w-full ${fieldErrors.name ? 'border-red-500' : ''}`}
                  />
                  {fieldErrors.name && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email" className="mb-2 block text-sm font-medium">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    required
                    placeholder="votre@email.com"
                    className={`w-full ${fieldErrors.email ? 'border-red-500' : ''}`}
                  />
                  {fieldErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="content" className="mb-2 block text-sm font-medium">Commentaire *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => handleFieldChange('content', e.target.value)}
                  required
                  placeholder="Partagez votre avis ou posez une question..."
                  rows={4}
                  className={`w-full resize-none ${fieldErrors.content ? 'border-red-500' : ''}`}
                />
                <div className="flex flex-col gap-1 mt-2">
                  {fieldErrors.content && (
                    <p className="text-red-500 text-sm">{fieldErrors.content}</p>
                  )}
                  <p className="text-gray-500 text-sm text-right">
                    {formData.content.length}/1000 caractères
                  </p>
                </div>
              </div>

              {/* reCAPTCHA */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <Label className="text-sm font-medium text-blue-800">Vérification de sécurité *</Label>
                </div>
                <div className="flex justify-center relative" style={{ zIndex: 99999, pointerEvents: 'auto' }}>
                  <div className="transform scale-90 sm:scale-100" style={{ zIndex: 99999, pointerEvents: 'auto' }}>
                    <ReCAPTCHA
                      ref={recaptchaRef}
                      sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"}
                      onChange={handleRecaptchaChange}
                      onExpired={resetRecaptcha}
                      onLoad={handleRecaptchaLoad}
                      onError={() => {
                        setFieldErrors(prev => ({ ...prev, captcha: 'Erreur reCAPTCHA. Veuillez réessayer.' }));
                      }}
                      style={{ 
                        zIndex: 99999,
                        transform: 'scale(1)',
                        transformOrigin: 'center',
                        pointerEvents: 'auto',
                        position: 'relative'
                      }}
                      theme="light"
                      size="normal"
                      tabindex={0}
                    />
                  </div>
                </div>
                {fieldErrors.captcha && (
                  <p className="text-red-500 text-sm mt-2 text-center">{fieldErrors.captcha}</p>
                )}
                <p className="text-xs text-blue-600 mt-2 text-center">
                  Cochez la case pour prouver que vous n'êtes pas un robot.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleModalChange(false)}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !isFormValid()}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto order-1 sm:order-2 bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Publier le commentaire
                    </>
                  )}
                </Button>
              </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des commentaires */}
      {approvedComments.length > 0 ? (
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div className="text-center sm:text-left">
              <h3 className="text-xl font-bold text-gray-800 flex items-center justify-center sm:justify-start gap-2">
                <div className="p-2 bg-blue-100 rounded-full">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                </div>
                Commentaires ({approvedComments.length})
              </h3>
              <p className="text-sm text-gray-600 mt-2">
                Tous les commentaires sont modérés et approuvés
              </p>
            </div>
            <div className="flex justify-center sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                <MessageCircle className="h-4 w-4" />
               Commenter
              </Button>
            </div>
          </div>
          
          <div className="space-y-4">
            {approvedComments.map((comment) => (
              <div 
                key={comment.id} 
                id={`comment-${comment.id}`}
                className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${
                  parseCommentDate(comment.createdAt) > new Date(Date.now() - 60000) ? 'animate-pulse bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 flex-shrink-0">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                      <span className="font-semibold text-gray-900 text-sm">{comment.name}</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(parseCommentDate(comment.createdAt))}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="text-center py-12 text-gray-500">
            <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <MessageCircle className="h-10 w-10 text-gray-400" />
            </div>
            <p className="text-xl font-semibold text-gray-700 mb-2">Aucun commentaire</p>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
              Soyez le premier à partager votre avis sur cet article !
            </p>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              <MessageCircle className="h-4 w-4" />
              Laisser un commentaire
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
});
