/* App navigation: Login → role tabs (staff / owner / franchise) + the detail screens pushed on top. */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppSelector } from '../store/hooks';
import LoginScreen from '../screens/auth/LoginScreen';
import SplashScreen from '../screens/auth/SplashScreen';
import EmailScreen from '../screens/auth/signup/EmailScreen';
import OtpScreen from '../screens/auth/signup/OtpScreen';
import AboutScreen from '../screens/auth/signup/AboutScreen';
import AddressScreen from '../screens/auth/signup/AddressScreen';
import PanScreen from '../screens/auth/signup/PanScreen';
import BankScreen from '../screens/auth/signup/BankScreen';
import PropertyScreen from '../screens/auth/signup/PropertyScreen';
import PasswordScreen from '../screens/auth/signup/PasswordScreen';
import PendingScreen from '../screens/auth/signup/PendingScreen';
import StaffTabs from './StaffTabs';
import OwnerTabs from './OwnerTabs';
import FranchiseTabs from './FranchiseTabs';
import RentRollScreen from '../screens/staff/RentRollScreen';
import PropertyDetailScreen from '../screens/staff/PropertyDetailScreen';
import SiteEvaluationScreen from '../screens/staff/SiteEvaluationScreen';
import ToApproveScreen from '../screens/staff/ToApproveScreen';
import TicketDetailScreen from '../screens/staff/TicketDetailScreen';
import ThreadScreen from '../screens/staff/ThreadScreen';
import TdsScreen from '../screens/staff/TdsScreen';
import InspectionItemScreen from '../screens/staff/InspectionItemScreen';
import AreaPhotosScreen from '../screens/staff/AreaPhotosScreen';
import VideoRecordingScreen from '../screens/staff/VideoRecordingScreen';
import SignOffScreen from '../screens/staff/SignOffScreen';
import InspectionAreaScreen from '../screens/staff/InspectionAreaScreen';
import InspectionHubScreen from '../screens/staff/InspectionHubScreen';
import { PropertiesScreen, SiteScoutingScreen, LeasesScreen, ExitsScreen, OwnersScreen, InvoicesScreen, DepositsScreen } from '../screens/staff/ListScreens';
import OwnerLedgersScreen from '../screens/staff/OwnerLedgersScreen';
import SearchScreen from '../screens/shared/SearchScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import NewInvoiceScreen from '../screens/owner/NewInvoiceScreen';
import DepositRequestScreen from '../screens/owner/DepositRequestScreen';
import RecordChallanScreen from '../screens/staff/RecordChallanScreen';
import RaiseTicketScreen from '../screens/shared/RaiseTicketScreen';
import AddSiteScreen from '../screens/shared/AddSiteScreen';
import OwnerLedgerScreen from '../screens/owner/OwnerLedgerScreen';
import AgreementsScreen from '../screens/owner/AgreementsScreen';
import MyDetailsScreen from '../screens/owner/MyDetailsScreen';
import DeleteAccountScreen from '../screens/shared/DeleteAccountScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { status, role } = useAppSelector(st => st.auth);
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {status === 'checking' ? (
        <Stack.Screen name="Splash" component={SplashScreen} options={{ animation: 'fade' }} />
      ) : status !== 'signedIn' ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUpEmail" component={EmailScreen} />
          <Stack.Screen name="SignUpOtp" component={OtpScreen} />
          <Stack.Screen name="SignUpAbout" component={AboutScreen} />
          <Stack.Screen name="SignUpAddress" component={AddressScreen} />
          <Stack.Screen name="SignUpPan" component={PanScreen} />
          <Stack.Screen name="SignUpBank" component={BankScreen} />
          <Stack.Screen name="SignUpProperty" component={PropertyScreen} />
          <Stack.Screen name="SignUpPassword" component={PasswordScreen} />
          <Stack.Screen name="SignUpPending" component={PendingScreen} />
        </>
      ) : (
        <>
          {role === 'owner' ? <Stack.Screen name="Tabs" component={OwnerTabs} />
            : role === 'franchise' ? <Stack.Screen name="Tabs" component={FranchiseTabs} />
              : <Stack.Screen name="Tabs" component={StaffTabs} />}
          <Stack.Screen name="RentRoll" component={RentRollScreen} />
          <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} />
          <Stack.Screen name="SiteEvaluation" component={SiteEvaluationScreen} />
          <Stack.Screen name="ToApprove" component={ToApproveScreen} />
          <Stack.Screen name="TicketDetail" component={TicketDetailScreen} />
          <Stack.Screen name="Thread" component={ThreadScreen} />
          <Stack.Screen name="Tds" component={TdsScreen} />
          <Stack.Screen name="InspectionItem" component={InspectionItemScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="InspectionArea" component={InspectionAreaScreen} />
          <Stack.Screen name="InspectionHub" component={InspectionHubScreen} />
          <Stack.Screen name="AreaPhotos" component={AreaPhotosScreen} />
          <Stack.Screen name="VideoRecording" component={VideoRecordingScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="SignOff" component={SignOffScreen} />
          <Stack.Screen name="Properties" component={PropertiesScreen} />
          <Stack.Screen name="SiteScouting" component={SiteScoutingScreen} />
          <Stack.Screen name="Leases" component={LeasesScreen} />
          <Stack.Screen name="Exits" component={ExitsScreen} />
          <Stack.Screen name="Owners" component={OwnersScreen} />
          <Stack.Screen name="Invoices" component={InvoicesScreen} />
          <Stack.Screen name="Deposits" component={DepositsScreen} />
          <Stack.Screen name="OwnerLedgers" component={OwnerLedgersScreen} />
          <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="NewInvoice" component={NewInvoiceScreen} />
          <Stack.Screen name="DepositRequest" component={DepositRequestScreen} />
          <Stack.Screen name="RecordChallan" component={RecordChallanScreen} />
          <Stack.Screen name="RaiseTicket" component={RaiseTicketScreen} />
          <Stack.Screen name="AddSite" component={AddSiteScreen} />
          <Stack.Screen name="OwnerLedger" component={OwnerLedgerScreen} />
          <Stack.Screen name="Agreements" component={AgreementsScreen} />
          <Stack.Screen name="MyDetails" component={MyDetailsScreen} />
          <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
