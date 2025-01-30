import userModel from '../models/userModel.js';

const authController = {
    // 로그인 처리
    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            const user = await userModel.validateUser(email, password);

            if (!user) {
                return res.status(401).json({
                    message:
                        '인증 실패: 이메일 또는 비밀번호가 일치하지 않습니다.',
                });
            }

            if (user) {
                // 세션에 사용자 정보 저장
                req.session.user = {
                    userId: user.user_id,
                    email: user.email,
                    username: user.username,
                    profileImage: user.profile_image_url,
                };

                req.session.save((err) => {
                    if (err) {
                        console.error('Session save error:', err);
                        return res
                            .status(500)
                            .json({ message: '세션 저장 오류' });
                    }

                    req.session.reload((err) => {
                        if (err) {
                            console.error('Session reload error:', err);
                        }
                        console.log('세션 저장 후:', req.session);
                    });

                    // 쿠키 설정 (1시간 유효)
                    res.cookie('session_id', req.sessionID, {
                        httpOnly: true,
                        maxAge: 1000 * 60 * 60,
                    });

                    // 로그인 성공 응답
                    res.json({
                        message: '로그인 성공(세션 저장)',
                        user,
                        data: {
                            sessionID: req.sessionID,
                        },
                    });
                });
                console.log('Session: ', req.session);
            } else {
                // 인증 실패 응답
                res.status(401).json({ message: '인증 실패' });
            }
        } catch (error) {
            // 서버 오류 처리
            res.status(500).json({ message: error.message });
        }
    },

    // 로그아웃 처리
    logout: (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ message: '로그아웃 실패' });
            }

            // ✅ `connect.sid` 및 `session_id` 쿠키 삭제 (설정과 동일한 옵션 유지)
            res.clearCookie('connect.sid', {
                httpOnly: true,
                sameSite: 'None',
                path: '/', // 쿠키를 설정할 때 사용한 path 유지
            });

            res.clearCookie('session_id', {
                httpOnly: true,
                sameSite: 'None',
                path: '/',
            });

            // ✅ Set-Cookie 헤더를 사용하여 강제 만료
            res.setHeader('Set-Cookie', [
                'connect.sid=; HttpOnly; Path=/; Max-Age=0; SameSite=None; Secure',
                'session_id=; HttpOnly; Path=/; Max-Age=0; SameSite=None; Secure',
            ]);

            res.json({
                message: '로그아웃 성공',
                data: null,
            });
        });
    },

    // 인증 여부 확인 미들웨어
    isAuthenticated: (req, res, next) => {
        if (!req.session.user) {
            // 인증되지 않은 경우
            return res
                .status(401)
                .json({ status: 401, message: '인증되지 않았습니다.' });
        }

        // 인증된 경우 다음 미들웨어로 이동
        next();
    },

    // 사용자 프로필 조회
    getProfile: async (req, res) => {
        try {
            // 세션에 사용자 정보가 있는지 확인
            if (!req.session?.user) {
                return res
                    .status(401)
                    .json({ message: '로그인이 필요합니다.' });
            }

            const userId = req.session.user.userId;
            const user = await userModel.getUserById(userId);

            if (!user) {
                // 사용자를 찾을 수 없는 경우
                return res
                    .status(404)
                    .json({ message: '사용자를 찾을 수 없습니다.' });
            }

            // 비밀번호 제외한 사용자 정보 반환
            const { password, ...userProfile } = user;
            res.status(200).json(userProfile);
        } catch (error) {
            // 서버 오류 처리
            console.error('사용자 정보 조회 오류:', error);
            res.status(500).json({
                message: '서버 오류가 발생했습니다.',
                error: error.message,
            });
        }
    },
};

export default authController;
