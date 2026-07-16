import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db as prisma } from "../db";

class AuthService {
    static registerUser = async (
        firstname: string, 
        lastname: string, 
        email?: string, 
        phone?: string, 
        password?: string, 
        address?: string
    ) => {
        const hashedPassword = await bcrypt.hash(password || '', 10);
        
        // Crée l'utilisateur d'authentification et son profil public en une transaction imbriquée
        const newUser = await prisma.user.create({
            data: {
                email: email || null,
                phone: phone || null,
                password: hashedPassword,
                profile: {
                    create: {
                        full_name: `${firstname} ${lastname}`,
                        email: email || null,
                        phone: phone || null,
                        whatsapp: phone || null, // whatsapp par défaut sur le numéro de téléphone
                        city: address
                    }
                }
            },
            include: {
                profile: true
            }
        });
        
        return newUser.profile;
    }

    static findUserById = async (id: string) => {
        return prisma.profile.findUnique({
            where: { id: id },
            select: {
                id: true,
                full_name: true,
                email: true,
                role: true,
                city: true,
                created_at: true
            }
        });
    }

    static findUserByEmail = async (email: string) => {
        return prisma.user.findUnique({
            where: { email: email },
            include: {
                profile: true
            }
        });
    }

    static findUserByPhone = async (phone: string) => {
        return prisma.user.findUnique({
            where: { phone: phone },
            include: {
                profile: true
            }
        });
    }

    static updateUser = async (
        id: string,
        full_name?: string,
        phone?: string,
        city?: string
    ) => {
        return prisma.profile.update({
            where: { id: id },
            data: {
                full_name: full_name,
                phone: phone,
                city: city
            }
        });
    }

    static loginUser = async (emailOrPhone: string, password: string) => {
        // Détermine s'il s'agit d'un email (contient '@') ou d'un numéro de téléphone
        const isEmail = emailOrPhone.includes('@');
        
        const user = isEmail 
            ? await this.findUserByEmail(emailOrPhone)
            : await this.findUserByPhone(emailOrPhone);

        if (!user) {
            throw new Error('User not found');
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('invalid password');
        }
        
        const token = jwt.sign(
            { 
                userId: user.id, 
                full_name: user.profile?.full_name || '', 
                role: user.role 
            },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '7d' }
        );
        return token;
    }
}

export default AuthService;