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
      }, 100);
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
      }, 200);
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
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 text-green-800">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="font-medium">Commentaire soumis avec succès !</p>
          </div>
          <p className="text-green-700 text-sm mt-1">
            Votre commentaire a été publié avec succès et est maintenant visible !
          </p>
        </Card>
      )}

      {/* Bouton pour ouvrir le modal de commentaire */}
      <div className="flex justify-center">
        <Dialog open={isModalOpen} onOpenChange={handleModalChange}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto comment-modal">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                Laisser un commentaire
              </DialogTitle>
              <DialogDescription className="mt-2">
                Partagez votre avis ou posez une question sur cet article. Votre commentaire sera publié immédiatement après validation du captcha de sécurité.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div >
                  <Label htmlFor="name" className="mb-2">Nom *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    required
                    placeholder="Votre nom"
                    className={fieldErrors.name ? 'border-red-500' : ''}
                  />
                  {fieldErrors.name && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email" className="mb-2">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    required
                    placeholder="votre@email.com"
                    className={fieldErrors.email ? 'border-red-500' : ''}
                  />
                  {fieldErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="content" className="mb-2">Commentaire *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => handleFieldChange('content', e.target.value)}
                  required
                  placeholder="Partagez votre avis ou posez une question..."
                  rows={4}
                  className={fieldErrors.content ? 'border-red-500' : ''}
                />
                <div className="flex justify-between items-center mt-1">
                  {fieldErrors.content && (
                    <p className="text-red-500 text-sm">{fieldErrors.content}</p>
                  )}
                  <p className="text-gray-500 text-sm ml-auto">
                    {formData.content.length}/1000 caractères
                  </p>
                </div>
              </div>

              {/* reCAPTCHA */}
              <div className="bg-gray-50 p-4 rounded-lg border relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <Label className="text-sm font-medium">Vérification de sécurité *</Label>
                </div>
                <div className="flex justify-center relative" style={{ zIndex: 9999 }}>
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
                      zIndex: 9999,
                      transform: 'scale(1)',
                      transformOrigin: 'center'
                    }}
                    theme="light"
                    size="normal"
                    tabindex={0}
                  />
                </div>
                {fieldErrors.captcha && (
                  <p className="text-red-500 text-sm mt-2 text-center">{fieldErrors.captcha}</p>
                )}
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Cochez la case pour prouver que vous n'êtes pas un robot.
                </p>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleModalChange(false)}
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !isFormValid()}
                  className="flex items-center gap-2"
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
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des commentaires */}
      {approvedComments.length > 0 ? (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">
                Commentaires ({approvedComments.length})
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Tous les commentaires sont modérés et approuvés
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2"
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
                className={`border-b border-gray-100 pb-4 last:border-b-0 ${
                  parseCommentDate(comment.createdAt) > new Date(Date.now() - 60000) ? 'animate-pulse bg-blue-50 rounded-2xl p-4' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{comment.name}</span>
                      <span className="text-sm text-gray-500">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {formatDate(parseCommentDate(comment.createdAt))}
                      </span>
                    </div>
                    <p className="text-gray-700">
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
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">Aucun commentaire</p>
            <p className="text-sm mb-4">
              Soyez le premier à commenter cet article !
            </p>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2"
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
