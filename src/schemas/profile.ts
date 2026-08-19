import { z } from "zod";

export const ProfileBasicInfoSchema = z.object({
  name: z.string(),
  regNo: z.string(),
  email: z.string(),
  program: z.string(),
  school: z.string(),
  photoUrl: z.string(),
});

export const ProfilePersonalSchema = z.object({
  appNo: z.string(),
  dob: z.string(),
  gender: z.string(),
  bloodGroup: z.string(),
  community: z.string(),
  caste: z.string(),
  religion: z.string(),
  nationality: z.string(),
  nativeState: z.string(),
  nativeLanguage: z.string(),
  physicallyChallenged: z.string(),
  aadhar: z.string(),
  mobile: z.string(),
  email: z.string(),
});

export const AddressSchema = z.object({
  street: z.string(),
  area: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  pincode: z.string(),
  phone: z.string(),
});

export const ProfileEducationSchema = z.object({
  degree: z.string(),
  qualification: z.string(),
  branch: z.string(),
  school: z.string(),
  medium: z.string(),
  board: z.string(),
  regNo: z.string(),
  classObtained: z.string(),
  year: z.string(),
  month: z.string(),
  breakInStudy: z.string(),
  breakReason: z.string(),
  address: AddressSchema,
});

export const ProfileFamilyMemberSchema = z.object({
  name: z.string(),
  qualification: z.string(),
  occupation: z.string(),
  organization: z.string(),
  designation: z.string(),
  mobile: z.string(),
  email: z.string(),
  income: z.string(),
  address: AddressSchema,
});

export const ProfileFamilySchema = z.object({
  brothers: z.string(),
  sisters: z.string(),
  studyingInVit: z.string(),
  studyingDetails: z.string(),
  studiedInVit: z.string(),
  studiedDetails: z.string(),
  father: ProfileFamilyMemberSchema,
  mother: ProfileFamilyMemberSchema,
  guardian: z.string(),
  friendMobile: z.string(),
});

export const ProfileProctorSchema = z.object({
  id: z.string(),
  name: z.string(),
  designation: z.string(),
  school: z.string(),
  cabin: z.string(),
  dept: z.string(),
  email: z.string(),
  mobile: z.string(),
  photoUrl: z.string(),
});

export const ProfileHostelSchema = z.object({
  appNo: z.string(),
  regNo: z.string(),
  block: z.string(),
  room: z.string(),
  bedType: z.string(),
  mess: z.string(),
}).nullable();

export const StudentProfileSchema = z.object({
  basic: ProfileBasicInfoSchema,
  personal: ProfilePersonalSchema,
  currentAddress: AddressSchema,
  permanentAddress: AddressSchema,
  education: ProfileEducationSchema,
  family: ProfileFamilySchema,
  proctor: ProfileProctorSchema,
  hostel: ProfileHostelSchema,
});

export type ProfileBasicInfoSchemaType = z.infer<typeof ProfileBasicInfoSchema>;
export type ProfilePersonalSchemaType = z.infer<typeof ProfilePersonalSchema>;
export type AddressSchemaType = z.infer<typeof AddressSchema>;
export type ProfileEducationSchemaType = z.infer<typeof ProfileEducationSchema>;
export type ProfileFamilyMemberSchemaType = z.infer<typeof ProfileFamilyMemberSchema>;
export type ProfileFamilySchemaType = z.infer<typeof ProfileFamilySchema>;
export type ProfileProctorSchemaType = z.infer<typeof ProfileProctorSchema>;
export type ProfileHostelSchemaType = z.infer<typeof ProfileHostelSchema>;
export type StudentProfileSchemaType = z.infer<typeof StudentProfileSchema>;
