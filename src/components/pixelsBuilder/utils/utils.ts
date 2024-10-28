import { isNumber, isString } from "lodash";

export const isStringNumber = (number: number | string | null) => {
	return isNumber(number) || (isString(number) && isNumber(parseInt(number)));
}

export function getRandomColor() {
	const r = Math.floor(Math.random() * 256);
	const g = Math.floor(Math.random() * 256);
	const b = Math.floor(Math.random() * 256);
	return `rgba(${r}, ${g}, ${b},0.5)`;
}

//首字母小写
export function firstLetterToLower(str: string) {
	if (str.length > 0) {
		return str.charAt(0).toLowerCase() + str.slice(1);
	}
	return str;
}  