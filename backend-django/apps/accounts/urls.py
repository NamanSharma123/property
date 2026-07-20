from django.urls import path

from . import views

urlpatterns = [
    path('auth/signup', views.SignupView.as_view()),
    path('auth/login', views.LoginView.as_view()),
    path('auth/logout', views.LogoutView.as_view()),
    path('auth/refresh', views.RefreshTokenView.as_view()),
    path('auth/me', views.MeView.as_view()),
    path('auth/profile', views.ProfileView.as_view()),
    path('auth/password', views.ChangePasswordView.as_view()),
    path('auth/forgot-password', views.ForgotPasswordView.as_view()),
    path('auth/reset-password', views.ResetPasswordView.as_view()),
    path('auth/sessions', views.SessionsView.as_view()),
    path('auth/sessions/<uuid:session_id>', views.RevokeSessionView.as_view()),
    path('auth/verify-password', views.VerifyPasswordView.as_view()),
    path('auth/account', views.DeleteAccountView.as_view()),
]
