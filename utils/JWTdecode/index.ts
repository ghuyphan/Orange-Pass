import { jwtDecode } from "jwt-decode";

interface DecodedToken {
    exp: number;
    [key: string]: any;
}

export const getTokenExpirationDate = (token: string) => {
    try {
        const decoded: DecodedToken = jwtDecode(token);
        if (decoded.exp) {
            return new Date(decoded.exp * 1000);
        }
    } catch (error) {
        console.log(error);
        return null;
    }
}