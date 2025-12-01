-- Ajouter une contrainte UNIQUE sur l'email dans la table profiles
-- pour s'assurer qu'un email ne peut pas être utilisé par deux utilisateurs

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_email_unique UNIQUE (email);