package utils

import (
	"crypto/rsa"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type TokenMaker struct {
	privateKey *rsa.PrivateKey
	publicKey  *rsa.PublicKey
	accessTTL  time.Duration
	refreshTTL time.Duration
}

func NewTokenMaker(privateKey *rsa.PrivateKey, publicKey *rsa.PublicKey, accessTTL, refreshTTL time.Duration) *TokenMaker {
	return &TokenMaker{
		privateKey: privateKey,
		publicKey:  publicKey,
		accessTTL:  accessTTL,
		refreshTTL: refreshTTL,
	}
}

func (s *TokenMaker) CreateTokens(userID int64) (accessToken string, refreshToken string, err error) {
	accessClaims := jwt.MapClaims{
		"uid":  userID,
		"type": "access",
		"exp":  time.Now().Add(s.accessTTL).Unix(),
		"iat":  time.Now().Unix(),
	}
	accessJWT := jwt.NewWithClaims(jwt.SigningMethodRS256, accessClaims)
	accessToken, err = accessJWT.SignedString(s.privateKey)
	if err != nil {
		return "", "", err
	}

	refreshClaims := jwt.MapClaims{
		"uid":  userID,
		"type": "refresh",
		"exp":  time.Now().Add(s.refreshTTL).Unix(),
		"iat":  time.Now().Unix(),
	}
	refreshJWT := jwt.NewWithClaims(jwt.SigningMethodRS256, refreshClaims)
	refreshToken, err = refreshJWT.SignedString(s.privateKey)
	if err != nil {
		return "", "", err
	}

	return accessToken, refreshToken, nil
}

func (s *TokenMaker) ValidateToken(tokenString string) (*jwt.Token, error) {
	return jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return s.publicKey, nil
	})
}
