from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):
    use_in_migrations = False

    def create_user(self, email, name=None, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        extra_fields.setdefault('role', 'staff')
        extra_fields.setdefault('account_status', 'active')
        user = self.model(
            email=self.normalize_email(email).lower(),
            name=name or email.split('@')[0],
            **extra_fields,
        )
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name=None, password=None, **extra_fields):
        extra_fields['role'] = 'admin'
        extra_fields.setdefault('account_status', 'active')
        return self.create_user(email, name, password, **extra_fields)
